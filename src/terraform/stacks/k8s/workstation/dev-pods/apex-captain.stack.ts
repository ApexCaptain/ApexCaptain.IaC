import path from 'path';
import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Workstation_Apps_Longhorn_Stack } from '../apps/longhorn.stack';
import { K8S_Workstation_K8S_Stack } from '../k8s.stack';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { AbstractStack, KubeConfig, createExpirationInterval } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { RoleBindingV1 } from '@lib/terraform/providers/kubernetes/role-binding-v1';
import { RoleV1 } from '@lib/terraform/providers/kubernetes/role-v1';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import { ServiceAccountV1 } from '@lib/terraform/providers/kubernetes/service-account-v1';
import { File } from '@lib/terraform/providers/local/file';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Workstation_DevPods_ApexCaptain_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      local: this.provide(LocalProvider, 'localProvider', () => ({})),
      kubernetes: this.provide(
        KubernetesProvider,
        'kubernetesProvider',
        () => ({
          configPath:
            this.k8sWorkstationK8SStack.kubeConfigFile.element.filename,
        }),
      ),
    },
  };

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sWorkstationSystemStack.devPodsMetadata.shared.ApexCaptain,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'istio-injection': 'disabled',
      },
    },
  }));

  serviceAccount = this.provide(ServiceAccountV1, 'serviceAccount', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
    },
  }));

  serviceAccountToken = this.provide(SecretV1, 'serviceAccountToken', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
      annotations: {
        'kubernetes.io/service-account.name':
          this.serviceAccount.element.metadata.name,
      },
    },
    type: 'kubernetes.io/service-account-token',
  }));

  role = this.provide(RoleV1, 'role', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
    },
    rule: [
      {
        apiGroups: [''],
        resources: ['*'],
        verbs: ['*'],
      },
      {
        apiGroups: ['apps', 'batch', 'extensions'],
        resources: ['*'],
        verbs: ['*'],
      },
    ],
  }));

  roleBinding = this.provide(RoleBindingV1, 'roleBinding', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
    },
    roleRef: {
      apiGroup: 'rbac.authorization.k8s.io',
      kind: 'Role',
      name: this.role.element.metadata.name,
    },
    subject: [
      {
        kind: 'ServiceAccount',
        name: this.serviceAccount.element.metadata.name,
        namespace: this.namespace.element.metadata.name,
      },
    ],
  }));

  kubeConfigFile = this.provide(File, 'kubeConfigFile', () => {
    const baseKubeConfig = this.k8sWorkstationK8SStack.kubeConfigFile.shared
      .kubeConfig as KubeConfig;
    const baseCluster = baseKubeConfig.clusters[0];
    const clusterName = `${baseCluster.name}`;
    const userName = this.namespace.element.metadata.name;
    const contextName = `${clusterName}-${userName}`;

    const kubeConfig: KubeConfig = {
      apiVersion: 'v1',
      kind: 'Config',
      preferences: {},
      'current-context': contextName,
      clusters: [
        {
          name: clusterName,
          cluster: {
            server: baseCluster.cluster.server,
            'certificate-authority-data': Fn.base64encode(
              Fn.lookup(this.serviceAccountToken.element.data, 'ca.crt'),
            ),
          },
        },
      ],
      contexts: [
        {
          name: contextName,
          context: {
            cluster: clusterName,
            user: userName,
            namespace: this.namespace.element.metadata.name,
          },
        },
      ],
      users: [
        {
          name: userName,
          user: {
            token: Fn.lookup(this.serviceAccountToken.element.data, 'token'),
          },
        },
      ],
    };

    return [
      {
        content: Fn.yamlencode(kubeConfig),
        filename: path.join(
          this.globalConfigService.config.terraform.stacks.k8s.workstation
            .devPods.kubeConfigDirPath,
          `${this.id}.yaml`,
        ),
      },
      {
        kubeConfig,
      },
    ];
  });

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationK8SStack: K8S_Workstation_K8S_Stack,
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_DevPods_ApexCaptain_Stack.name,
      'ApexCaptain dev-pod stack for workstation k8s',
    );
  }
}
