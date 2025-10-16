import path from 'path';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import dedent from 'dedent';
import _ from 'lodash';
import { K8S_Workstation_Apps_Game_Stack } from './game.stack';
import { AbstractStack, createExpirationInterval } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { ConfigMap } from '@lib/terraform/providers/kubernetes/config-map';
import { DeploymentV1 } from '@lib/terraform/providers/kubernetes/deployment-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import { SensitiveFile } from '@lib/terraform/providers/local/sensitive-file';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { TimeProvider } from '@lib/terraform/providers/time/provider';
import { StaticResource } from '@lib/terraform/providers/time/static-resource';
import { PrivateKey } from '@lib/terraform/providers/tls/private-key';
import { TlsProvider } from '@lib/terraform/providers/tls/provider';

@Injectable()
export class K8S_Workstation_Apps_Game_Sftp_Stack extends AbstractStack {
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
          `${K8S_Workstation_Apps_Game_Sftp_Stack.name}-${id}.key`,
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
      name: `${this.k8sWorkstationAppsGameStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace:
        this.k8sWorkstationAppsGameStack.namespace.element.metadata.name,
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
          name: this.k8sWorkstationAppsGameStack.metadata.shared.services.sftp
            .name,
          namespace:
            this.k8sWorkstationAppsGameStack.namespace.element.metadata.name,
        },
        spec: {
          selector,
          type: 'ClusterIP',
          port: [
            this.k8sWorkstationAppsGameStack.metadata.shared.services.sftp.ports
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
      this.k8sWorkstationAppsGameStack.config.sftp.userName,
      sftpDataDirName,
    );
    return {
      metadata: {
        name: `${this.k8sWorkstationAppsGameStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace:
          this.k8sWorkstationAppsGameStack.namespace.element.metadata.name,
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
                name: this.k8sWorkstationAppsGameStack.metadata.shared.services
                  .sftp.ports.sftp.name,
                image: 'atmoz/sftp',
                imagePullPolicy: 'Always',
                command: [
                  'sh',
                  '-c',
                  `chmod o+w ${sftpDataDirContainerPath} && /entrypoint ${this.k8sWorkstationAppsGameStack.config.sftp.userName}::::${sftpDataDirName}`,
                ],
                port: [
                  {
                    containerPort:
                      this.k8sWorkstationAppsGameStack.metadata.shared.services
                        .sftp.ports.sftp.port,
                    protocol:
                      this.k8sWorkstationAppsGameStack.metadata.shared.services
                        .sftp.ports.sftp.protocol,
                  },
                ],
                volumeMount: [
                  {
                    mountPath: `/home/${this.k8sWorkstationAppsGameStack.config.sftp.userName}/.ssh/keys`,
                    name: this.sftpAuthConfigMap.element.metadata.name,
                    readOnly: true,
                  },
                  {
                    name: this.k8sWorkstationAppsGameStack
                      .sdtdSavesPersistentVolumeClaim.element.metadata.name,
                    mountPath: path.join(
                      sftpDataDirContainerPath,
                      '7dtd',
                      'saves',
                    ),
                  },
                  {
                    name: this.k8sWorkstationAppsGameStack
                      .sdtdBackupsPersistentVolumeClaim.element.metadata.name,
                    mountPath: path.join(
                      sftpDataDirContainerPath,
                      '7dtd',
                      'backups',
                    ),
                  },
                  {
                    name: this.k8sWorkstationAppsGameStack
                      .sdtdLgsmConfigPersistentVolumeClaim.element.metadata
                      .name,
                    mountPath: path.join(
                      sftpDataDirContainerPath,
                      '7dtd',
                      'lgsm-config',
                    ),
                  },
                  {
                    name: this.k8sWorkstationAppsGameStack
                      .sdtdLogsPersistentVolumeClaim.element.metadata.name,
                    mountPath: path.join(
                      sftpDataDirContainerPath,
                      '7dtd',
                      'logs',
                    ),
                  },
                  {
                    name: this.k8sWorkstationAppsGameStack
                      .sdtdServerConfigPersistentVolumeClaim.element.metadata
                      .name,
                    mountPath: path.join(
                      sftpDataDirContainerPath,
                      '7dtd',
                      'server-config',
                    ),
                  },
                  {
                    name: this.k8sWorkstationAppsGameStack
                      .sdtdServerSideModsPersistentVolumeClaim.element.metadata
                      .name,
                    mountPath: path.join(
                      sftpDataDirContainerPath,
                      '7dtd',
                      'server-side-mods',
                    ),
                  },
                  {
                    name: this.k8sWorkstationAppsGameStack
                      .sdtdBothSidesModsPersistentVolumeClaim.element.metadata
                      .name,
                    mountPath: path.join(
                      sftpDataDirContainerPath,
                      '7dtd',
                      'both-sides-mods',
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
                name: this.k8sWorkstationAppsGameStack
                  .sdtdSavesPersistentVolumeClaim.element.metadata.name,
                persistentVolumeClaim: {
                  claimName:
                    this.k8sWorkstationAppsGameStack
                      .sdtdSavesPersistentVolumeClaim.element.metadata.name,
                },
              },
              {
                name: this.k8sWorkstationAppsGameStack
                  .sdtdBackupsPersistentVolumeClaim.element.metadata.name,
                persistentVolumeClaim: {
                  claimName:
                    this.k8sWorkstationAppsGameStack
                      .sdtdBackupsPersistentVolumeClaim.element.metadata.name,
                },
              },
              {
                name: this.k8sWorkstationAppsGameStack
                  .sdtdLgsmConfigPersistentVolumeClaim.element.metadata.name,
                persistentVolumeClaim: {
                  claimName:
                    this.k8sWorkstationAppsGameStack
                      .sdtdLgsmConfigPersistentVolumeClaim.element.metadata
                      .name,
                },
              },
              {
                name: this.k8sWorkstationAppsGameStack
                  .sdtdLogsPersistentVolumeClaim.element.metadata.name,
                persistentVolumeClaim: {
                  claimName:
                    this.k8sWorkstationAppsGameStack
                      .sdtdLogsPersistentVolumeClaim.element.metadata.name,
                },
              },
              {
                name: this.k8sWorkstationAppsGameStack
                  .sdtdServerConfigPersistentVolumeClaim.element.metadata.name,
                persistentVolumeClaim: {
                  claimName:
                    this.k8sWorkstationAppsGameStack
                      .sdtdServerConfigPersistentVolumeClaim.element.metadata
                      .name,
                },
              },
              {
                name: this.k8sWorkstationAppsGameStack
                  .sdtdServerSideModsPersistentVolumeClaim.element.metadata
                  .name,
                persistentVolumeClaim: {
                  claimName:
                    this.k8sWorkstationAppsGameStack
                      .sdtdServerSideModsPersistentVolumeClaim.element.metadata
                      .name,
                },
              },
              {
                name: this.k8sWorkstationAppsGameStack
                  .sdtdBothSidesModsPersistentVolumeClaim.element.metadata.name,
                persistentVolumeClaim: {
                  claimName:
                    this.k8sWorkstationAppsGameStack
                      .sdtdBothSidesModsPersistentVolumeClaim.element.metadata
                      .name,
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
    private readonly k8sWorkstationAppsGameStack: K8S_Workstation_Apps_Game_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Game_Sftp_Stack.name,
      'Game sftp stack for workstation k8s',
    );
  }
}
