import path from 'path';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import dedent from 'dedent';
import _ from 'lodash';
import { K8S_Workstation_K8S_Stack } from '../k8s.stack';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { K8S_Workstation_Apps_Longhorn_Stack } from './longhorn.stack';
import { AbstractStack, createExpirationInterval } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { ConfigMapV1 } from '@lib/terraform/providers/kubernetes/config-map-v1';
import { Manifest } from '@lib/terraform/providers/kubernetes/manifest';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { PersistentVolumeClaimV1 } from '@lib/terraform/providers/kubernetes/persistent-volume-claim-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
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
export class K8S_Workstation_Apps_Wink_Stack extends AbstractStack {
  config =
    this.globalConfigService.config.terraform.stacks.k8s.workstation.apps.wink;

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
      kubernetes: this.provide(
        KubernetesProvider,
        'kubernetesProvider',
        () => ({
          configPath:
            this.k8sWorkstationK8SStack.kubeConfigFile.element.filename,
        }),
      ),
      time: this.provide(TimeProvider, 'timeProvider', () => ({})),
    },
  };

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sWorkstationSystemStack.applicationMetadata.shared.wink,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'istio-injection': 'enabled',
      },
    },
  }));

  sshPrivateKeyExpiration = this.provide(
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

  sshPrivateKey = this.provide(Resource, 'sshPrivateKey', idPrefix => {
    const expirationElement = this.sshPrivateKeyExpiration.element;
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
          `${K8S_Workstation_Apps_Wink_Stack.name}-${id}.key`,
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

  service = this.provide(ServiceV1, 'service', () => ({
    metadata: {
      name: this.metadata.shared.services.wink.name,
      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      selector: this.metadata.shared.services.wink.labels,
      port: Object.values(this.metadata.shared.services.wink.ports),
    },
  }));

  sshdConfigMap = this.provide(ConfigMapV1, 'sshdConfigMap', id => {
    const sshdConfigKey = 'sshd_config';
    return [
      {
        metadata: {
          name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace: this.namespace.element.metadata.name,
        },
        data: {
          sshd_config: dedent`
            PermitRootLogin no
            PasswordAuthentication no
            ChallengeResponseAuthentication no
        `,
        },
      },
      { sshdConfigKey },
    ];
  });

  userHomePersistentVolumeClaim = this.provide(
    PersistentVolumeClaimV1,
    'userHomePersistentVolumeClaim',
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
            storage: '50Gi',
          },
        },
      },
    }),
  );

  userSshAuthorizedKeysSecret = this.provide(
    SecretV1,
    'userSshAuthorizedKeysSecret',
    id => {
      const envKeyUserSshAuthorizedKeys = 'USER_SSH_AUTHORIZED_KEYS';
      return [
        {
          metadata: {
            name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
            namespace: this.namespace.element.metadata.name,
          },
          data: {
            [envKeyUserSshAuthorizedKeys]: [
              this.sshPrivateKey.shared.key.element.publicKeyOpenssh,
            ].join(','),
          },
        },
        { envKeyUserSshAuthorizedKeys },
      ];
    },
  );

  // k exec -it deployment/wink-deployment -n wink -- /bin/bash
  /**
   * @ToDo terraform k8s provider에서 user namespace(hostUsers 필드)를 지원하지 않아서 manifest로 대체,
   * 이미 테스트 버전에선 적용 된 거 같으니 새 provider가 배포되면 교체 적용
   */
  deployment = this.provide(Manifest, 'deployment', id => {
    const userHomePath = `/home/${this.config.userName}`;
    const sshDirPath = path.join(userHomePath, '.ssh');
    const authorizedKeysFilePath = path.join(sshDirPath, 'authorized_keys');

    return {
      manifest: {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace: this.namespace.element.metadata.name,
        },
        spec: {
          replicas: '1',
          selector: {
            matchLabels: this.metadata.shared.services.wink.labels,
          },
          template: {
            metadata: {
              labels: this.metadata.shared.services.wink.labels,
            },
            spec: {
              runtimeClassName:
                this.k8sWorkstationSystemStack.installSysboxManifest.shared
                  .runimeClassName,
              hostUsers: false,
              containers: [
                {
                  name: this.metadata.shared.services.wink.name,
                  image:
                    'registry.nestybox.com/nestybox/ubuntu-focal-systemd-docker',
                  imagePullPolicy: 'Always',
                  command: [
                    '/bin/bash',
                    '-c',
                    dedent`
                      id ${this.config.userName} >/dev/null 2>&1 || useradd -m -d ${userHomePath} -s /bin/bash ${this.config.userName}
                      mkdir -p ${sshDirPath} && chmod 700 ${sshDirPath}
                      echo $${this.userSshAuthorizedKeysSecret.shared.envKeyUserSshAuthorizedKeys} | tr ',' '\n' > ${authorizedKeysFilePath}
                      chown -R ${this.config.userName}:${this.config.userName} ${sshDirPath}
                    
                      usermod -aG docker ${this.config.userName}
                      newgrp docker

                      '/sbin/init'
                    `,
                    ,
                  ],
                  envFrom: [
                    {
                      secretRef: {
                        name: this.userSshAuthorizedKeysSecret.element.metadata
                          .name,
                      },
                    },
                  ],
                  volumeMounts: [
                    {
                      name: this.userHomePersistentVolumeClaim.element.metadata
                        .name,
                      mountPath: userHomePath,
                    },
                    {
                      name: this.sshdConfigMap.element.metadata.name,
                      mountPath: `/etc/ssh/sshd_config.d/${this.sshdConfigMap.element.metadata.name}.conf`,
                      subPath: this.sshdConfigMap.shared.sshdConfigKey,
                    },
                  ],
                },
              ],
              volumes: [
                {
                  name: this.userHomePersistentVolumeClaim.element.metadata
                    .name,
                  persistentVolumeClaim: {
                    claimName:
                      this.userHomePersistentVolumeClaim.element.metadata.name,
                  },
                },
                {
                  name: this.sshdConfigMap.element.metadata.name,
                  configMap: {
                    name: this.sshdConfigMap.element.metadata.name,
                  },
                },
              ],
            },
          },
        },
      },
      lifecycle: {
        replaceTriggeredBy: [
          `${this.userSshAuthorizedKeysSecret.element.terraformResourceType}.${this.userSshAuthorizedKeysSecret.element.friendlyUniqueId}`,
          `${this.sshdConfigMap.element.terraformResourceType}.${this.sshdConfigMap.element.friendlyUniqueId}`,
        ],
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
    private readonly k8sWorkstationK8SStack: K8S_Workstation_K8S_Stack,
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
    private readonly k8sWorkstationLonghornStack: K8S_Workstation_Apps_Longhorn_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Wink_Stack.name,
      'Wink stack for workstation k8s',
    );
  }
}
