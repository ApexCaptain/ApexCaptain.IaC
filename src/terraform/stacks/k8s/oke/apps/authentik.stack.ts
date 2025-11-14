import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import yaml from 'yaml';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { K8S_Oke_System_Stack } from '../system.stack';
import { K8S_Oke_Apps_Istio_Gateway_Stack } from './istio.gateway.stack';
import { K8S_Oke_Apps_Nfs_Stack } from './nfs.stack';
import {
  AbstractStack,
  IstioPeerAuthentication,
  IstioVirtualService,
} from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import {
  Cloudflare_Record_Oke_Stack,
  Cloudflare_Zone_Stack,
} from '@/terraform/stacks/cloudflare';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { AuthentikProviderConfig } from '@lib/terraform/providers/authentik/provider';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { PersistentVolumeClaimV1 } from '@lib/terraform/providers/kubernetes/persistent-volume-claim-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { RoleBindingV1 } from '@lib/terraform/providers/kubernetes/role-binding-v1';
import { RoleV1 } from '@lib/terraform/providers/kubernetes/role-v1';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { RandomProvider } from '@lib/terraform/providers/random/provider';
import { StringResource } from '@lib/terraform/providers/random/string-resource';

@Injectable()
export class K8S_Oke_Apps_Authentik_Stack extends AbstractStack {
  config =
    this.globalConfigService.config.terraform.stacks.k8s.oke.apps.authentik;

  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
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
      helm: this.provide(HelmProvider, 'helmProvider', () => ({
        kubernetes: {
          proxyUrl:
            this.k8sOkeEndpointStack.okeEndpointSource.shared.proxyUrl.socks5,
          configPath:
            this.k8sOkeEndpointStack.okeEndpointSource.shared
              .kubeConfigFilePath,
        },
      })),
      random: this.provide(RandomProvider, 'randomProvider', () => ({})),
    },
  };

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.authentik,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'istio-injection': 'enabled',
      },
    },
  }));

  defaultPeerAuthentication = this.provide(
    IstioPeerAuthentication,
    'defaultPeerAuthentication',
    () => ({
      manifest: {
        metadata: {
          name: 'default',
          namespace: this.namespace.element.metadata.name,
        },
        spec: {
          mtls: {
            mode: 'PERMISSIVE' as const,
          },
        },
      },
    }),
  );

  authentikBootstrapToken = this.provide(
    StringResource,
    'authentikBootstrapToken',
    () => ({
      length: 32,
      special: true,
    }),
  );

  authentikBootstrapSecret = this.provide(
    SecretV1,
    'authentikBootstrapSecret',
    () => ({
      metadata: {
        name: `${this.namespace.element.metadata.name}-authentik-bootstrap`,
        namespace: this.namespace.element.metadata.name,
      },
      data: {
        AUTHENTIK_BOOTSTRAP_EMAIL: this.config.bootstrap.email,
        AUTHENTIK_BOOTSTRAP_TOKEN: this.authentikBootstrapToken.element.result,
        AUTHENTIK_BOOTSTRAP_PASSWORD: this.config.bootstrap.password,
      },
    }),
  );

  authentikSecretKey = this.provide(
    StringResource,
    'authentikSecretKey',
    () => ({
      length: 32,
      special: false,
    }),
  );

  postgresqlPassword = this.provide(
    StringResource,
    'postgresqlPassword',
    () => ({
      length: 32,
      special: false,
    }),
  );

  postgresqlPasswordSecret = this.provide(
    SecretV1,
    'postgresqlPasswordSecret',
    () => {
      const passwordKey = 'password';
      return [
        {
          metadata: {
            name: `${this.namespace.element.metadata.name}-postgresql-password`,
            namespace: this.namespace.element.metadata.name,
          },
          data: {
            [passwordKey]: this.postgresqlPassword.element.result,
          },
          type: 'Opaque',
        },
        {
          passwordKey,
        },
      ];
    },
  );

  redisPassword = this.provide(StringResource, 'redisPassword', () => ({
    length: 32,
    special: false,
  }));

  redisPasswordSecret = this.provide(SecretV1, 'redisPasswordSecret', () => {
    const passwordKey = 'password';
    return [
      {
        metadata: {
          name: `${this.namespace.element.metadata.name}-redis-password`,
          namespace: this.namespace.element.metadata.name,
        },
        data: {
          [passwordKey]: this.redisPassword.element.result,
        },
        type: 'Opaque',
      },
      {
        passwordKey,
      },
    ];
  });

  postgresqlPvc = this.provide(
    PersistentVolumeClaimV1,
    'postgresqlPvc',
    id => ({
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      spec: {
        storageClassName: this.k8sOkeNfsStack.release.shared.storageClassName,
        accessModes: ['ReadWriteOnce'],
        resources: {
          requests: {
            storage: '8Gi',
          },
        },
      },
    }),
  );

  redisPvc = this.provide(PersistentVolumeClaimV1, 'redisPvc', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      storageClassName: this.k8sOkeNfsStack.release.shared.storageClassName,
      accessModes: ['ReadWriteOnce'],
      resources: {
        requests: {
          storage: '8Gi',
        },
      },
    },
  }));

  authentikRelease = this.provide(Release, 'authentikRelease', () => {
    const serviceAccountName = 'authentik';
    const postgresCredSecretName = 'postgres-cred';
    const postgresCredSecretMountPath = '/postgres-creds';
    const redisCredSecretName = 'redis-cred';
    const redisCredSecretMountPath = '/redis-creds';
    const serverServiceName = 'authentik-server';
    const serverServiceHttpPort = 80;

    return [
      {
        name: this.metadata.shared.helm.authentik.name,
        chart: this.metadata.shared.helm.authentik.chart,
        repository: this.metadata.shared.helm.authentik.repository,
        namespace: this.namespace.element.metadata.name,
        createNamespace: false,
        values: [
          yaml.stringify({
            global: {
              envFrom: [
                {
                  secretRef: {
                    name: this.authentikBootstrapSecret.element.metadata.name,
                  },
                },
              ],
            },
            authentik: {
              secret_key: this.authentikSecretKey.element.result,
              postgresql: {
                password: `file://${postgresCredSecretMountPath}/${this.postgresqlPasswordSecret.shared.passwordKey}`,
              },
              redis: {
                password: `file://${redisCredSecretMountPath}/${this.redisPasswordSecret.shared.passwordKey}`,
              },
            },
            server: {
              serviceAccountName,
              service: {
                servicePortHttp: serverServiceHttpPort,
              },
              env: [
                {
                  name: 'AUTHENTIK_HOST',
                  value: `https://${this.cloudflareRecordOkeStack.authentikRecord.element.name}`,
                },
              ],
              volumes: [
                {
                  name: postgresCredSecretName,
                  secret: {
                    secretName:
                      this.postgresqlPasswordSecret.element.metadata.name,
                  },
                },
                {
                  name: redisCredSecretName,
                  secret: {
                    secretName: this.redisPasswordSecret.element.metadata.name,
                  },
                },
              ],
              volumeMounts: [
                {
                  name: postgresCredSecretName,
                  mountPath: postgresCredSecretMountPath,
                  readOnly: true,
                },
                {
                  name: redisCredSecretName,
                  mountPath: redisCredSecretMountPath,
                  readOnly: true,
                },
              ],
            },
            worker: {
              volumes: [
                {
                  name: postgresCredSecretName,
                  secret: {
                    secretName:
                      this.postgresqlPasswordSecret.element.metadata.name,
                  },
                },
                {
                  name: redisCredSecretName,
                  secret: {
                    secretName: this.redisPasswordSecret.element.metadata.name,
                  },
                },
              ],
              volumeMounts: [
                {
                  name: postgresCredSecretName,
                  mountPath: postgresCredSecretMountPath,
                  readOnly: true,
                },
                {
                  name: redisCredSecretName,
                  mountPath: redisCredSecretMountPath,
                  readOnly: true,
                },
              ],
            },

            // PostgreSQL
            postgresql: {
              enabled: true,
              auth: {
                existingSecret:
                  this.postgresqlPasswordSecret.element.metadata.name,
                secretKeys: {
                  userPasswordKey:
                    this.postgresqlPasswordSecret.shared.passwordKey,
                },
              },
              primary: {
                persistence: {
                  enabled: true,
                  existingClaim: this.postgresqlPvc.element.metadata.name,
                },
              },
            },

            // Redis
            redis: {
              enabled: true,
              auth: {
                enabled: true,
                existingSecret: this.redisPasswordSecret.element.metadata.name,
                existingSecretPasswordKey:
                  this.redisPasswordSecret.shared.passwordKey,
              },
              master: {
                persistence: {
                  enabled: true,
                  existingClaim: this.redisPvc.element.metadata.name,
                },
              },
            },
          }),
        ],
      },
      {
        serverServiceName,
        serviceAccountName,
        serverServiceHttpPort,
      },
    ];
  });

  authentikServerVirtualService = this.provide(
    IstioVirtualService,
    'authentikServerVirtualService',
    id => {
      const host = this.cloudflareRecordOkeStack.authentikRecord.element.name;
      return [
        {
          manifest: {
            metadata: {
              name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
              namespace: this.namespace.element.metadata.name,
            },
            spec: {
              hosts: [host],
              gateways: [
                this.k8sOkeAppsIstioGatewayStack.istioIngressGateway.shared
                  .gatewayPath,
              ],
              http: [
                {
                  route: [
                    {
                      destination: {
                        host: this.authentikRelease.shared.serverServiceName,
                        port: {
                          number:
                            this.authentikRelease.shared.serverServiceHttpPort,
                        },
                      },
                    },
                  ],
                  corsPolicy: {
                    allowOrigins: [
                      {
                        regex: `https://.*\\.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
                      },
                    ],
                    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                    allowHeaders: [
                      'Content-Type',
                      'Authorization',
                      'X-Requested-With',
                      'X-authentik-auth-callback',
                    ],
                    exposeHeaders: ['Content-Type', 'Authorization'],
                    allowCredentials: true,
                    maxAge: '24h',
                  },
                },
              ],
            },
          },
          dependsOn: [this.authentikRelease.element],
        },
        {
          webUrl: `https://${host}`,
        },
      ];
    },
  );

  authentikRole = this.provide(RoleV1, 'authentikRole', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
    },
    rule: [
      {
        apiGroups: [''],
        resources: ['pods', 'services', 'secrets'],
        verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'],
      },
      {
        apiGroups: ['apps'],
        resources: ['deployments', 'statefulsets'],
        verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'],
      },
    ],
  }));

  authentikRoleBinding = this.provide(
    RoleBindingV1,
    'authentikRoleBinding',
    id => ({
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'Role',
        name: this.authentikRole.element.metadata.name,
      },
      subject: [
        {
          kind: 'ServiceAccount',
          name: this.authentikRelease.shared.serviceAccountName,
          namespace: this.namespace.element.metadata.name,
        },
      ],
    }),
  );

  authentikProviderConfig = this.provide(
    Resource,
    'authentikProviderConfig',
    () => {
      const config: AuthentikProviderConfig = {
        url: this.authentikServerVirtualService.shared.webUrl,
        token: this.authentikBootstrapToken.element.result,
      };
      return [{}, { config }];
    },
  );

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Stacks
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly k8sOkeNfsStack: K8S_Oke_Apps_Nfs_Stack,
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
    private readonly cloudflareRecordOkeStack: Cloudflare_Record_Oke_Stack,
    private readonly k8sOkeAppsIstioGatewayStack: K8S_Oke_Apps_Istio_Gateway_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Authentik_Stack.name,
      'Authentik stack for OKE k8s',
    );
  }
}
