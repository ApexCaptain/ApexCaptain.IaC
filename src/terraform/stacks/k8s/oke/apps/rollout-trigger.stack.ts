import { AbstractStack, createExpirationInterval } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import { Resource } from '@lib/terraform/providers/null/resource';
import _ from 'lodash';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { K8S_Oke_System_Stack } from '../system.stack';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { ServiceAccountV1 } from '@lib/terraform/providers/kubernetes/service-account-v1';
import { ClusterRoleBindingV1 } from '@lib/terraform/providers/kubernetes/cluster-role-binding-v1';
import { ClusterRoleV1 } from '@lib/terraform/providers/kubernetes/cluster-role-v1';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import { DeploymentV1 } from '@lib/terraform/providers/kubernetes/deployment-v1';
import { ConfigMapV1 } from '@lib/terraform/providers/kubernetes/config-map-v1';
import path from 'path';
import { StatefulSetV1SpecTemplateSpecContainerPort } from '@lib/terraform/providers/kubernetes/stateful-set-v1';
import { RandomProvider } from '@lib/terraform/providers/random/provider';
import { StringResource } from '@lib/terraform/providers/random/string-resource';

@Injectable()
export class K8S_Oke_Apps_RolloutTrigger_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      random: this.provide(RandomProvider, 'randomProvider', () => ({})),
      kubernetes: this.provide(
        KubernetesProvider,
        'kubernetesProvider',
        () => ({
          proxyUrl:
            this.k8sOkeEndpointStack.okeEndpointSource.shared.proxyUrl.socks5,
          configPath:
            this.k8sOkeEndpointStack.okeEndpointSource.shared
              .kubeConfigFilePath,
        }),
      ),
    },
  };

  private readonly metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.rolloutTrigger,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
    },
  }));

  service = this.provide(ServiceV1, 'service', () => ({
    metadata: {
      name: this.metadata.shared.services.rolloutTrigger.name,
      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      selector: this.metadata.shared.services.rolloutTrigger.labels,
      port: Object.values(this.metadata.shared.services.rolloutTrigger.ports),
    },
  }));

  serviceAccount = this.provide(ServiceAccountV1, 'serviceAccount', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
    },
  }));

  clusterRole = this.provide(ClusterRoleV1, 'clusterRole', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
    },
    rule: [
      {
        apiGroups: ['apps'],
        resources: ['deployments', 'statefulsets'],
        verbs: ['get', 'list', 'watch', 'patch'],
      },
    ],
  }));

  clusterRoleBinding = this.provide(
    ClusterRoleBindingV1,
    'clusterRoleBinding',
    id => ({
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      },
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ClusterRole',
        name: this.clusterRole.element.metadata.name,
      },
      subject: [
        {
          kind: 'ServiceAccount',
          name: this.serviceAccount.element.metadata.name,
          namespace: this.namespace.element.metadata.name,
        },
      ],
    }),
  );

  configMap = this.provide(ConfigMapV1, 'configMap', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
    },
    data: {
      'main.js': Fn.file(
        path.join(process.cwd(), 'assets/static/rollout-trigger.main.js'),
      ),
    },
  }));

  xApiKey = this.provide(StringResource, 'xApiKey', () => ({
    length: 64,
    special: false,
    keepers: {
      expirationDate: createExpirationInterval({
        days: 30,
      }).toString(),
    },
  })).addOutput(
    id => `${id}_out`,
    ele => ({
      value: ele,
      sensitive: true,
    }),
  );

  deployment = this.provide(DeploymentV1, 'deployment', id => {
    const applicationPath = '/app';
    const apiResourcePath = '/rollOut';

    return [
      {
        metadata: {
          name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace: this.namespace.element.metadata.name,
        },
        spec: {
          replicas: '1',
          selector: {
            matchLabels: this.metadata.shared.services.rolloutTrigger.labels,
          },
          template: {
            metadata: {
              labels: this.metadata.shared.services.rolloutTrigger.labels,
            },
            spec: {
              serviceAccountName: this.serviceAccount.element.metadata.name,
              container: [
                {
                  name: this.metadata.shared.services.rolloutTrigger.name,
                  image: 'lachlanevenson/k8s-kubectl:latest',
                  imagePullPolicy: 'Always',
                  command: [
                    'sh',
                    '-c',
                    `apk add --update nodejs npm  && cd ${applicationPath} && npm init -y && npm install express && node main.js`,
                  ],
                  env: [
                    {
                      name: 'PORT',
                      value:
                        this.metadata.shared.services.rolloutTrigger.ports
                          .rolloutTrigger.targetPort,
                    },
                    {
                      name: 'API_RESOURCE_PATH',
                      value: apiResourcePath,
                    },
                    {
                      name: 'X_API_KEY',
                      value: this.xApiKey.element.result,
                    },
                  ],
                  ports: Object.values(
                    this.metadata.shared.services.rolloutTrigger.ports,
                  ).map<StatefulSetV1SpecTemplateSpecContainerPort>(
                    eachPort => ({
                      containerPort: parseInt(eachPort.targetPort),
                      protocol: eachPort.protocol,
                    }),
                  ),
                  volumeMount: [
                    {
                      name: this.configMap.element.metadata.name,
                      mountPath: `${applicationPath}/main.js`,
                      subPath: 'main.js',
                    },
                  ],
                },
              ],
              volume: [
                {
                  name: this.configMap.element.metadata.name,
                  configMap: {
                    name: this.configMap.element.metadata.name,
                  },
                },
              ],
            },
          },
        },
        lifecycle: {
          replaceTriggeredBy: [
            `${this.configMap.element.terraformResourceType}.${this.configMap.element.friendlyUniqueId}`,
          ],
        },
      },
      { apiResourcePath },
    ];
  });

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_RolloutTrigger_Stack.name,
      'Rollout Trigger stack for OKE k8s',
    );
  }
}
