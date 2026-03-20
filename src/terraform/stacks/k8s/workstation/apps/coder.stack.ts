import path from 'path';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import dedent from 'dedent';
import _ from 'lodash';
import yaml from 'yaml';
import { K8S_Workstation_K8S_Stack } from '../k8s.stack';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { K8S_Workstation_Apps_IngressController_Stack } from './ingress-controller.stack';
import { K8S_Workstation_Apps_Longhorn_Stack } from './longhorn.stack';
import { K8S_Workstation_Apps_Metallb_Stack } from './metallb.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Cloudflare_Record_Workstation_Stack } from '@/terraform/stacks/cloudflare';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { CoderdProviderConfig } from '@lib/terraform/providers/coderd/provider';
import { DataExternal } from '@lib/terraform/providers/external/data-external';
import { ExternalProvider } from '@lib/terraform/providers/external/provider';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { RandomProvider } from '@lib/terraform/providers/random/provider';
import { StringResource } from '@lib/terraform/providers/random/string-resource';

@Injectable()
export class K8S_Workstation_Apps_Coder_Stack extends AbstractStack {
  config =
    this.globalConfigService.config.terraform.stacks.k8s.workstation.apps.coder;

  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      random: this.provide(RandomProvider, 'randomProvider', () => ({})),
      external: this.provide(ExternalProvider, 'externalProvider', () => ({})),
      kubernetes: this.provide(
        KubernetesProvider,
        'kubernetesProvider',
        () => ({
          configPath:
            this.k8sWorkstationK8SStack.kubeConfigFile.element.filename,
        }),
      ),
      helm: this.provide(HelmProvider, 'helmProvider', () => ({
        kubernetes: {
          configPath:
            this.k8sWorkstationK8SStack.kubeConfigFile.element.filename,
        },
      })),
    },
  };

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sWorkstationSystemStack.applicationMetadata.shared.coder,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'istio-injection': 'enabled',
      },
    },
  }));

  postgresqlPassword = this.provide(
    StringResource,
    'postgresqlPassword',
    () => ({
      length: 32,
      special: false,
    }),
  );

  postgresqlRelease = this.provide(Release, 'postgresqlRelease', () => {
    const username = 'coder';
    const database = 'coder';
    const serviceName = 'postgresql';
    const servicePort = 5432;
    return [
      {
        name: this.metadata.shared.helm.postgresql.name,
        chart: this.metadata.shared.helm.postgresql.chart,
        repository: this.metadata.shared.helm.postgresql.repository,
        namespace: this.namespace.element.metadata.name,
        createNamespace: false,
        values: [
          yaml.stringify({
            image: {
              repository: 'bitnamilegacy/postgresql',
            },
            auth: {
              username,
              database,
              password: this.postgresqlPassword.element.result,
            },
            primary: {
              persistence: {
                storageClass:
                  this.k8sWorkstationLonghornStack.longhornSsdStorageClass
                    .element.metadata.name,
                size: '10Gi',
              },
            },
          }),
        ],
      },
      {
        username,
        database,
        serviceName,
        servicePort,
      },
    ];
  });

  postgresqlUrlSecret = this.provide(SecretV1, 'postgresqlUrlSecret', id => {
    const dataKeyUrl = 'url';
    return [
      {
        metadata: {
          name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace: this.namespace.element.metadata.name,
        },
        data: {
          [dataKeyUrl]: `postgres://${this.postgresqlRelease.shared.username}:${this.postgresqlPassword.element.result}@${this.postgresqlRelease.shared.serviceName}.${this.namespace.element.metadata.name}.svc.cluster.local:${this.postgresqlRelease.shared.servicePort}/${this.postgresqlRelease.shared.database}?sslmode=disable`,
        },
        type: 'Opaque',
        dependsOn: [this.postgresqlRelease.element],
      },
      {
        dataKeyUrl,
      },
    ];
  });

  coderGithubOauth2Secret = this.provide(
    SecretV1,
    'coderGithubOauth2Secret',
    id => {
      const dataKeyClientId = 'CLIENT_ID';
      const dataKeyClientSecret = 'CLIENT_SECRET';
      return [
        {
          metadata: {
            name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
            namespace: this.namespace.element.metadata.name,
          },
          data: {
            [dataKeyClientId]: this.config.githubOauth2.clientId,
            [dataKeyClientSecret]: this.config.githubOauth2.clientSecret,
          },
          type: 'Opaque',
        },
        {
          dataKeyClientId,
          dataKeyClientSecret,
        },
      ];
    },
  );

  coderAdminUserSecret = this.provide(SecretV1, 'coderAdminUserSecret', id => {
    const dataKeyEmail = 'EMAIL';
    const dataKeyUsername = 'USERNAME';
    const dataKeyFullName = 'FULL_NAME';
    const dataKeyPassword = 'PASSWORD';
    return [
      {
        metadata: {
          name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace: this.namespace.element.metadata.name,
        },
        data: {
          [dataKeyEmail]: this.config.adminUser.email,
          [dataKeyUsername]: this.config.adminUser.username,
          [dataKeyFullName]: this.config.adminUser.fullName,
          [dataKeyPassword]: this.config.adminUser.password,
        },
        type: 'Opaque',
      },
      {
        dataKeyEmail,
        dataKeyUsername,
        dataKeyFullName,
        dataKeyPassword,
      },
    ];
  });

  coderRelease = this.provide(Release, 'coderRelease', () => {
    const domain =
      this.cloudflareRecordWorkstationStack.coderRecord.element.name;
    const coderPodLabelKey = 'app.kubernetes.io/name';
    const coderPodLabelValue = 'coder';

    return [
      {
        name: this.metadata.shared.helm.coder.name,
        chart: this.metadata.shared.helm.coder.chart,
        repository: this.metadata.shared.helm.coder.repository,
        namespace: this.namespace.element.metadata.name,
        createNamespace: false,
        values: [
          yaml.stringify({
            coder: {
              podLabels: {
                [coderPodLabelKey]: coderPodLabelValue,
              },
              env: [
                {
                  name: 'CODER_ACCESS_URL',
                  value: `https://${domain}`,
                },
                {
                  name: 'CODER_PG_CONNECTION_URL',
                  valueFrom: {
                    secretKeyRef: {
                      name: this.postgresqlUrlSecret.element.metadata.name,
                      key: this.postgresqlUrlSecret.shared.dataKeyUrl,
                    },
                  },
                },
                {
                  name: 'CODER_OAUTH2_GITHUB_DEVICE_FLOW',
                  value: true.toString(),
                },
                {
                  name: 'CODER_OAUTH2_GITHUB_DEFAULT_PROVIDER_ENABLE',
                  value: false.toString(),
                },
                {
                  name: 'CODER_OAUTH2_GITHUB_ALLOW_SIGNUPS',
                  value: false.toString(),
                },
                {
                  name: 'CODER_OAUTH2_GITHUB_CLIENT_ID',
                  valueFrom: {
                    secretKeyRef: {
                      name: this.coderGithubOauth2Secret.element.metadata.name,
                      key: this.coderGithubOauth2Secret.shared.dataKeyClientId,
                    },
                  },
                },
                {
                  name: 'CODER_OAUTH2_GITHUB_CLIENT_SECRET',
                  valueFrom: {
                    secretKeyRef: {
                      name: this.coderGithubOauth2Secret.element.metadata.name,
                      key: this.coderGithubOauth2Secret.shared
                        .dataKeyClientSecret,
                    },
                  },
                },
                {
                  name: 'CODER_OAUTH2_GITHUB_ALLOW_EVERYONE',
                  value: true.toString(),
                },

                {
                  name: 'CODER_FIRST_USER_EMAIL',
                  valueFrom: {
                    secretKeyRef: {
                      name: this.coderAdminUserSecret.element.metadata.name,
                      key: this.coderAdminUserSecret.shared.dataKeyEmail,
                    },
                  },
                },
                {
                  name: 'CODER_FIRST_USER_USERNAME',
                  valueFrom: {
                    secretKeyRef: {
                      name: this.coderAdminUserSecret.element.metadata.name,
                      key: this.coderAdminUserSecret.shared.dataKeyUsername,
                    },
                  },
                },
                {
                  name: 'CODER_FIRST_USER_FULL_NAME',
                  valueFrom: {
                    secretKeyRef: {
                      name: this.coderAdminUserSecret.element.metadata.name,
                      key: this.coderAdminUserSecret.shared.dataKeyFullName,
                    },
                  },
                },
                {
                  name: 'CODER_FIRST_USER_PASSWORD',
                  valueFrom: {
                    secretKeyRef: {
                      name: this.coderAdminUserSecret.element.metadata.name,
                      key: this.coderAdminUserSecret.shared.dataKeyPassword,
                    },
                  },
                },
                {
                  name: 'CODER_FIRST_USER_TRIAL',
                  value: false.toString(),
                },
              ],
              service: {
                loadBalancerIP: this.k8sWorkstationMetallbStack.config.coderIp,
              },
              ingress: {
                enable: true,
                className:
                  this.k8sWorkstationAppsIngressControllerStack.release.shared
                    .ingressClassName,
                host: domain,
              },
            },
          }),
        ],
      },
      {
        domain,
        coderPodLabelKey,
        coderPodLabelValue,
      },
    ];
  });

  generateCoderAdminToken = this.provide(
    DataExternal,
    'generateCoderAdminToken',
    () => {
      const tokenKey = 'token';
      return [
        {
          dependsOn: [this.coderRelease.element],
          program: [
            'bash',
            '-c',
            dedent`
            ts-node ${path.join(process.cwd(), 'scripts', 'external', 'generate-coder-admin-token.external.ts')} \
              --called-from-terraform \
              --kubeconfig ${this.k8sWorkstationK8SStack.kubeConfigFile.element.filename} \
              --namespace ${this.namespace.element.metadata.name} \
              --coder-server-url https://${this.coderRelease.shared.domain} \
              --coder-pod-label-key ${this.coderRelease.shared.coderPodLabelKey} \
              --coder-pod-label-value ${this.coderRelease.shared.coderPodLabelValue} \
              --admin-user-email ${this.config.adminUser.email} \
              --admin-user-password ${this.config.adminUser.password} \
              --token-name ${this.config.adminUser.tokenName} \
              --refresh-token-before-expiration-hours ${this.config.adminUser.refreshTokenBeforeExpirationHours} \
              --stored-token-secret-file-name ${this.config.adminUser.storedTokenSecretFileName}
          `,
          ],
        },
        { tokenKey },
      ];
    },
  );

  cdktfCoderdProviderConfig = this.provide(
    Resource,
    'cdktfCoderdProviderConfig',
    () => {
      const coderdProviderConfig: CoderdProviderConfig = {
        url: `https://${this.coderRelease.shared.domain}`,
        token: this.generateCoderAdminToken.element.result.lookup(
          this.generateCoderAdminToken.shared.tokenKey,
        ),
      };
      return [{}, coderdProviderConfig];
    },
  );

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationK8SStack: K8S_Workstation_K8S_Stack,
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
    private readonly k8sWorkstationLonghornStack: K8S_Workstation_Apps_Longhorn_Stack,
    private readonly k8sWorkstationMetallbStack: K8S_Workstation_Apps_Metallb_Stack,
    private readonly cloudflareRecordWorkstationStack: Cloudflare_Record_Workstation_Stack,
    private readonly k8sWorkstationAppsIngressControllerStack: K8S_Workstation_Apps_IngressController_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Coder_Stack.name,
      'Coder stack for workstation k8s',
    );
    this.addDependency(this.k8sWorkstationMetallbStack);
    this.addDependency(this.k8sWorkstationAppsIngressControllerStack);
  }
}
