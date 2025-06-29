import { AbstractStack, createExpirationInterval } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import { LocalBackend } from 'cdktf';
import { K8S_Workstation_Apps_Longhorn_Stack } from './longhorn.stack';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { Resource } from '@lib/terraform/providers/null/resource';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import { TlsProvider } from '@lib/terraform/providers/tls/provider';
import path from 'path';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { SensitiveFile } from '@lib/terraform/providers/local/sensitive-file';
import { PrivateKey } from '@lib/terraform/providers/tls/private-key';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { ConfigMap } from '@lib/terraform/providers/kubernetes/config-map';
import { PersistentVolumeClaimV1 } from '@lib/terraform/providers/kubernetes/persistent-volume-claim-v1';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import { TimeProvider } from '@lib/terraform/providers/time/provider';
import { StaticResource } from '@lib/terraform/providers/time/static-resource';
import { DeploymentV1 } from '@lib/terraform/providers/kubernetes/deployment-v1';
import { IngressV1 } from '@lib/terraform/providers/kubernetes/ingress-v1';
import { Cloudflare_Zone_Stack } from '@/terraform/stacks/cloudflare/zone.stack';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare/record.stack';
import { K8S_Oke_Apps_OAuth2Proxy_Stack } from '../../oke/apps/oauth2-proxy.stack';
import dedent from 'dedent';

@Injectable()
export class K8S_Workstation_Apps_Files_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.k8s.workstation.apps.files;

  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      local: this.provide(LocalProvider, 'localProvider', () => ({})),
      tls: this.provide(TlsProvider, 'tlsProvider', () => ({})),
      kubernetes: this.provide(KubernetesProvider, 'kubernetesProvider', () =>
        this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation(),
      ),
      time: this.provide(TimeProvider, 'timeProvider', () => ({})),
    },
  };

  privateKeyExpiration = this.provide(
    StaticResource,
    `privateKeyExpiration`,
    () => ({
      triggers: {
        expirationDate: createExpirationInterval({
          days: 60,
        }).toString(),
      },
    }),
  );

  privateKey = this.provide(Resource, 'privateKey', idPrefix => {
    const expirationElement = this.privateKeyExpiration.element;
    const key = this.provide(PrivateKey, `${idPrefix}-key`, () => ({
      algorithm: 'RSA',
      rsaBits: 4096,
      lifecycle: {
        replaceTriggeredBy: [
          `${expirationElement.terraformResourceType}.${expirationElement.friendlyUniqueId}`,
        ],
      },
    }));

    const privateSshKeyFileInSecrets = this.provide(
      SensitiveFile,
      `${idPrefix}-privateSshKeyFileInSecrets`,
      id => ({
        filename: path.join(
          process.cwd(),
          this.globalConfigService.config.terraform.stacks.common
            .generatedKeyFilesDirPaths.relativeSecretsDirPath,
          `${K8S_Workstation_Apps_Files_Stack.name}-${id}.key`,
        ),
        content: key.element.privateKeyOpenssh,
      }),
    );

    return [
      {},
      {
        key,
        privateSshKeyFileInSecrets,
      },
    ];
  });

  private readonly metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sWorkstationSystemStack.applicationMetadata.shared.files,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
    },
  }));

  fbDatabasePersistentVolumeClaim = this.provide(
    PersistentVolumeClaimV1,
    'fbDatabasePersistentVolumeClaim',
    id => ({
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      spec: {
        storageClassName:
          this.k8sWorkstationLonghornStack.longhornSsdStorageClass.element
            .metadata.name,
        accessModes: ['ReadWriteOnce'],
        resources: {
          requests: {
            storage: '100Mi',
          },
        },
      },
      lifecycle: {
        preventDestroy: true,
      },
    }),
  );

  dataPersistentVolumeClaim = this.provide(
    PersistentVolumeClaimV1,
    'dataPersistentVolumeClaim',
    id => ({
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      spec: {
        storageClassName:
          this.k8sWorkstationLonghornStack.longhornHddStorageClass.element
            .metadata.name,
        accessModes: ['ReadWriteOnce'],
        resources: {
          requests: {
            storage: '2Ti',
          },
        },
      },
      lifecycle: {
        preventDestroy: true,
      },
    }),
  );

  sftpConfigMap = this.provide(ConfigMap, 'sftpConfigMap', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
    },
    data: {
      'ssh-public-key': this.privateKey.shared.key.element.publicKeyOpenssh,
    },
  }));

  service = this.provide(ServiceV1, 'service', () => ({
    metadata: {
      name: this.metadata.shared.services.files.name,
      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      selector: this.metadata.shared.services.files.labels,
      type: 'NodePort',
      port: Object.values(this.metadata.shared.services.files.ports),
    },
  }));

  deployment = this.provide(DeploymentV1, 'deployment', id => {
    const sftpDataDirName = 'data';
    const sftpDataDirContainerPath = path.join(
      'home',
      this.config.sftp.userName,
      sftpDataDirName,
    );

    return {
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      spec: {
        replicas: '1',
        selector: {
          matchLabels: this.metadata.shared.services.files.labels,
        },
        template: {
          metadata: {
            labels: this.metadata.shared.services.files.labels,
          },
          spec: {
            securityContext: {
              fsGroup: '1000',
            },
            container: [
              {
                name: this.metadata.shared.services.files.ports['file-browser']
                  .name,
                image: 'filebrowser/filebrowser',
                imagePullPolicy: 'Always',
                port: [
                  {
                    containerPort:
                      this.metadata.shared.services.files.ports['file-browser']
                        .port,
                    protocol:
                      this.metadata.shared.services.files.ports['file-browser']
                        .protocol,
                  },
                ],
                securityContext: {
                  runAsUser: '1000',
                  runAsGroup: '1000',
                },
                volumeMount: [
                  {
                    name: this.fbDatabasePersistentVolumeClaim.element.metadata
                      .name,
                    mountPath: '/database',
                    subPath: 'database',
                  },
                  {
                    name: this.fbDatabasePersistentVolumeClaim.element.metadata
                      .name,
                    mountPath: '/config',
                    subPath: 'config',
                  },
                  {
                    name: this.dataPersistentVolumeClaim.element.metadata.name,
                    mountPath: '/srv',
                  },
                ],
                env: [
                  {
                    name: 'FB_NOAUTH',
                    value: 'true',
                  },
                  {
                    name: 'FB_PORT',
                    value:
                      this.metadata.shared.services.files.ports['file-browser']
                        .targetPort,
                  },
                ],
              },
              {
                name: this.metadata.shared.services.files.ports.sftp.name,
                image: 'atmoz/sftp',
                imagePullPolicy: 'Always',
                command: [
                  'sh',
                  '-c',
                  `chmod o+w ${sftpDataDirContainerPath} && /entrypoint ${this.config.sftp.userName}::::${sftpDataDirName}`,
                ],
                port: [
                  {
                    containerPort:
                      this.metadata.shared.services.files.ports.sftp.port,
                    protocol:
                      this.metadata.shared.services.files.ports.sftp.protocol,
                  },
                ],
                volumeMount: [
                  {
                    mountPath: `/home/${this.config.sftp.userName}/.ssh/keys`,
                    name: this.sftpConfigMap.element.metadata.name,
                    readOnly: true,
                  },
                  {
                    name: this.dataPersistentVolumeClaim.element.metadata.name,
                    mountPath: sftpDataDirContainerPath,
                  },
                ],
              },
            ],
            volume: [
              {
                name: this.fbDatabasePersistentVolumeClaim.element.metadata
                  .name,
                persistentVolumeClaim: {
                  claimName:
                    this.fbDatabasePersistentVolumeClaim.element.metadata.name,
                },
              },
              {
                name: this.dataPersistentVolumeClaim.element.metadata.name,
                persistentVolumeClaim: {
                  claimName:
                    this.dataPersistentVolumeClaim.element.metadata.name,
                },
              },
              {
                name: this.sftpConfigMap.element.metadata.name,
                configMap: {
                  name: this.sftpConfigMap.element.metadata.name,
                },
              },
            ],
          },
        },
      },
    };
  });

  ingress = this.provide(IngressV1, 'ingress', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
      annotations: {
        'nginx.ingress.kubernetes.io/backend-protocol': 'HTTP',
        'nginx.ingress.kubernetes.io/rewrite-target': '/',

        'nginx.ingress.kubernetes.io/auth-url':
          this.k8sOkeAppsOAuth2ProxyStack.oauth2ProxyAdminRelease.shared
            .authUrl,
        'nginx.ingress.kubernetes.io/auth-signin':
          this.k8sOkeAppsOAuth2ProxyStack.oauth2ProxyAdminRelease.shared
            .authSignin,
        'nginx.ingress.kubernetes.io/auth-snippet': dedent`
            if ($request_uri ~ "/share") {
              return 200;
            }
            if ($request_uri ~ "/api/public/dl") {
              return 200;
            }
          `,
      },
    },
    spec: {
      ingressClassName: 'nginx',
      rule: [
        {
          host: `${this.cloudflareRecordStack.workstationFilesRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
          http: {
            path: [
              {
                path: '/',
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: this.service.element.metadata.name,
                    port: {
                      number:
                        this.metadata.shared.services.files.ports[
                          'file-browser'
                        ].port,
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationLonghornStack: K8S_Workstation_Apps_Longhorn_Stack,
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
    private readonly k8sOkeAppsOAuth2ProxyStack: K8S_Oke_Apps_OAuth2Proxy_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Files_Stack.name,
      'Files stack for workstation k8s',
    );
    this.addDependency(this.k8sWorkstationLonghornStack);
    this.addDependency(this.k8sOkeAppsOAuth2ProxyStack);
  }
}
