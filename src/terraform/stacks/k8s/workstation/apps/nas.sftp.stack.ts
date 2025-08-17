import { AbstractStack, createExpirationInterval } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { TimeProvider } from '@lib/terraform/providers/time/provider';
import { StaticResource } from '@lib/terraform/providers/time/static-resource';
import { TlsProvider } from '@lib/terraform/providers/tls/provider';
import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import { Resource } from '@lib/terraform/providers/null/resource';
import { LocalBackend } from 'cdktf';
import { SensitiveFile } from '@lib/terraform/providers/local/sensitive-file';
import { PrivateKey } from '@lib/terraform/providers/tls/private-key';
import path from 'path';
import { ConfigMap } from '@lib/terraform/providers/kubernetes/config-map';
import { K8S_Workstation_Apps_Nas_Stack } from './nas.stack';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import { DeploymentV1 } from '@lib/terraform/providers/kubernetes/deployment-v1';
import dedent from 'dedent';

@Injectable()
export class K8S_Workstation_Apps_Nas_Sftp_Stack extends AbstractStack {
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

  sftpPrivateKeyExpiration = this.provide(
    StaticResource,
    `sftpPrivateKeyExpiration`,
    () => ({
      triggers: {
        expirationDate: createExpirationInterval({
          days: 60,
        }).toString(),
      },
    }),
  );

  sftpPrivateKey = this.provide(Resource, 'sftpPrivateKey', idPrefix => {
    const expirationElement = this.sftpPrivateKeyExpiration.element;
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
          `${K8S_Workstation_Apps_Nas_Sftp_Stack.name}-${id}.key`,
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

  sftpAuthConfigMap = this.provide(ConfigMap, 'sftpAuthConfigMap', id => ({
    metadata: {
      name: `${this.k8sWorkstationAppsNasStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace:
        this.k8sWorkstationAppsNasStack.namespace.element.metadata.name,
    },
    data: {
      'ssh-public-key': this.sftpPrivateKey.shared.key.element.publicKeyOpenssh,
    },
  }));

  sftpService = this.provide(ServiceV1, 'sftpService', () => {
    const selector = {
      app: 'sftp',
    };
    return [
      {
        metadata: {
          name: this.k8sWorkstationAppsNasStack.metadata.shared.services.sftp
            .name,
          namespace:
            this.k8sWorkstationAppsNasStack.namespace.element.metadata.name,
        },
        spec: {
          selector,
          type: 'ClusterIP',
          port: [
            this.k8sWorkstationAppsNasStack.metadata.shared.services.sftp.ports
              .sftp,
          ],
        },
      },
      { selector },
    ];
  });

  sftpDeployment = this.provide(DeploymentV1, 'sftpDeployment', id => {
    const sftpDataDirName = 'data';
    const sftpDataDirContainerPath = path.join(
      'home',
      this.k8sWorkstationAppsNasStack.config.sftp.userName,
      sftpDataDirName,
    );
    return {
      metadata: {
        name: `${this.k8sWorkstationAppsNasStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace:
          this.k8sWorkstationAppsNasStack.namespace.element.metadata.name,
      },
      spec: {
        replicas: '1',
        selector: {
          matchLabels: this.sftpService.shared.selector,
        },
        template: {
          metadata: {
            labels: this.sftpService.shared.selector,
          },
          spec: {
            container: [
              {
                name: this.k8sWorkstationAppsNasStack.metadata.shared.services
                  .sftp.ports.sftp.name,
                image: 'atmoz/sftp',
                imagePullPolicy: 'Always',
                command: [
                  'sh',
                  '-c',
                  `chmod o+w ${sftpDataDirContainerPath} && /entrypoint ${this.k8sWorkstationAppsNasStack.config.sftp.userName}::::${sftpDataDirName}`,
                ],
                port: [
                  {
                    containerPort:
                      this.k8sWorkstationAppsNasStack.metadata.shared.services
                        .sftp.ports.sftp.port,
                    protocol:
                      this.k8sWorkstationAppsNasStack.metadata.shared.services
                        .sftp.ports.sftp.protocol,
                  },
                ],
                volumeMount: [
                  {
                    mountPath: `/home/${this.k8sWorkstationAppsNasStack.config.sftp.userName}/.ssh/keys`,
                    name: this.sftpAuthConfigMap.element.metadata.name,
                    readOnly: true,
                  },
                  {
                    name: this.k8sWorkstationAppsNasStack
                      .qbittorrentConfigPersistentVolumeClaim.element.metadata
                      .name,
                    mountPath: path.join(
                      sftpDataDirContainerPath,
                      'qbittorrent',
                      'config',
                    ),
                  },
                  {
                    name: this.k8sWorkstationAppsNasStack
                      .qbittorrentCompleteDownloadsPersistentVolumeClaim.element
                      .metadata.name,
                    mountPath: path.join(
                      sftpDataDirContainerPath,
                      'qbittorrent',
                      'complete-downloads',
                    ),
                  },
                  {
                    name: this.k8sWorkstationAppsNasStack
                      .qbittorrentIncompleteDownloadsPersistentVolumeClaim
                      .element.metadata.name,
                    mountPath: path.join(
                      sftpDataDirContainerPath,
                      'qbittorrent',
                      'incomplete-downloads',
                    ),
                  },
                  {
                    name: this.k8sWorkstationAppsNasStack
                      .jellyfinConfigPersistentVolumeClaim.element.metadata
                      .name,
                    mountPath: path.join(
                      sftpDataDirContainerPath,
                      'jellyfin',
                      'config',
                    ),
                  },
                  {
                    name: this.k8sWorkstationAppsNasStack
                      .jellyfinMediaPersistentVolumeClaim.element.metadata.name,
                    mountPath: path.join(
                      sftpDataDirContainerPath,
                      'jellyfin',
                      'media',
                    ),
                  },
                  {
                    name: this.k8sWorkstationAppsNasStack
                      .sftpExtraDataPersistentVolumeClaim.element.metadata.name,
                    mountPath: path.join(
                      sftpDataDirContainerPath,
                      'sftp',
                      'extra-data',
                    ),
                  },
                ],
                lifecycle: {
                  postStart: [
                    {
                      exec: {
                        command: [
                          'sh',
                          '-c',
                          dedent`
                            find ${sftpDataDirContainerPath} -type d -name 'lost+found' -exec rm -rf {} +
                          `,
                        ],
                      },
                    },
                  ],
                },
              },
            ],
            volume: [
              {
                name: this.sftpAuthConfigMap.element.metadata.name,
                configMap: {
                  name: this.sftpAuthConfigMap.element.metadata.name,
                },
              },
              {
                name: this.k8sWorkstationAppsNasStack
                  .qbittorrentConfigPersistentVolumeClaim.element.metadata.name,
                persistentVolumeClaim: {
                  claimName:
                    this.k8sWorkstationAppsNasStack
                      .qbittorrentConfigPersistentVolumeClaim.element.metadata
                      .name,
                },
              },
              {
                name: this.k8sWorkstationAppsNasStack
                  .qbittorrentCompleteDownloadsPersistentVolumeClaim.element
                  .metadata.name,
                persistentVolumeClaim: {
                  claimName:
                    this.k8sWorkstationAppsNasStack
                      .qbittorrentCompleteDownloadsPersistentVolumeClaim.element
                      .metadata.name,
                },
              },
              {
                name: this.k8sWorkstationAppsNasStack
                  .qbittorrentIncompleteDownloadsPersistentVolumeClaim.element
                  .metadata.name,
                persistentVolumeClaim: {
                  claimName:
                    this.k8sWorkstationAppsNasStack
                      .qbittorrentIncompleteDownloadsPersistentVolumeClaim
                      .element.metadata.name,
                },
              },
              {
                name: this.k8sWorkstationAppsNasStack
                  .jellyfinConfigPersistentVolumeClaim.element.metadata.name,
                persistentVolumeClaim: {
                  claimName:
                    this.k8sWorkstationAppsNasStack
                      .jellyfinConfigPersistentVolumeClaim.element.metadata
                      .name,
                },
              },
              {
                name: this.k8sWorkstationAppsNasStack
                  .jellyfinMediaPersistentVolumeClaim.element.metadata.name,
                persistentVolumeClaim: {
                  claimName:
                    this.k8sWorkstationAppsNasStack
                      .jellyfinMediaPersistentVolumeClaim.element.metadata.name,
                },
              },
              {
                name: this.k8sWorkstationAppsNasStack
                  .sftpExtraDataPersistentVolumeClaim.element.metadata.name,
                persistentVolumeClaim: {
                  claimName:
                    this.k8sWorkstationAppsNasStack
                      .sftpExtraDataPersistentVolumeClaim.element.metadata.name,
                },
              },
            ],
          },
        },
      },
    };
  });

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationAppsNasStack: K8S_Workstation_Apps_Nas_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Nas_Sftp_Stack.name,
      'Nas sftp stack for workstation k8s',
    );
  }
}
