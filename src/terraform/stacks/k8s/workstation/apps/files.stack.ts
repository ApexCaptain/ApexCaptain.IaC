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
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
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
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import yaml from 'yaml';

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
      helm: this.provide(HelmProvider, 'helmProvider', () => ({
        kubernetes: {
          configPath:
            this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation()
              .configPath,
          insecure: true,
        },
      })),
      time: this.provide(TimeProvider, 'timeProvider', () => ({})),
    },
  };

  private readonly metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sWorkstationSystemStack.applicationMetadata.shared.files,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'istio-injection': 'enabled',
      },
    },
  }));

  nordLynxPrivateKeySecret = this.provide(
    SecretV1,
    'nordLynxPrivateKeySecret',
    id => {
      const key = 'nord-lynx-private-key';
      return [
        {
          metadata: {
            name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
            namespace: this.namespace.element.metadata.name,
          },
          data: {
            [key]:
              this.globalConfigService.config.terraform.stacks.k8s.workstation
                .common.nordLynxPrivateKey,
          },
          type: 'Opaque',
        },
        {
          key,
        },
      ];
    },
  );

  // PVCs -- DangeZone, Do not delete
  sharedFilesPersistentVolumeClaim = this.provide(
    PersistentVolumeClaimV1,
    'sharedFilesPersistentVolumeClaim',
    id => {
      const dataRootDirPath = 'data';
      const torrentDirName = 'torrent';

      return [
        {
          metadata: {
            name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
            namespace: this.namespace.element.metadata.name,
          },
          spec: {
            storageClassName:
              this.k8sWorkstationLonghornStack.longhornHddStorageClass.element
                .metadata.name,
            accessModes: ['ReadWriteMany'],
            resources: {
              requests: {
                storage: '3Ti',
              },
            },
          },
          lifecycle: {
            preventDestroy: true,
          },
        },
        {
          dataRootDirPath,
          torrentDirPath: path.join(dataRootDirPath, torrentDirName),
        },
      ];
    },
  );

  fileBrowserConfigPersistentVolumeClaim = this.provide(
    PersistentVolumeClaimV1,
    'fileBrowserConfigPersistentVolumeClaim',
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
            storage: '200Mi',
          },
        },
      },
      lifecycle: {
        preventDestroy: true,
      },
    }),
  );

  qbittorrentConfigPersistentVolumeClaim = this.provide(
    PersistentVolumeClaimV1,
    'qbittorrentConfigPersistentVolumeClaim',
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
            storage: '200Mi',
          },
        },
      },
      lifecycle: {
        preventDestroy: true,
      },
    }),
  );

  qbittorrentIncompleteDownloadsPersistentVolumeClaim = this.provide(
    PersistentVolumeClaimV1,
    'qbittorrentIncompleteDownloadsPersistentVolumeClaim',
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
            storage: '300Gi',
          },
        },
      },
      lifecycle: {
        preventDestroy: true,
      },
    }),
  );

  jellyfinConfigPersistentVolumeClaim = this.provide(
    PersistentVolumeClaimV1,
    'jellyfinConfigPersistentVolumeClaim',
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
            storage: '10Gi',
          },
        },
      },
      lifecycle: {
        preventDestroy: true,
      },
    }),
  );

  // SFTP
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

  sftpAuthConfigMap = this.provide(ConfigMap, 'sftpAuthConfigMap', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
    },
    data: {
      'ssh-public-key': this.sftpPrivateKey.shared.key.element.publicKeyOpenssh,
    },
  }));

  sftpService = this.provide(ServiceV1, 'sftpService', id => {
    const selector = {
      app: 'sftp',
    };
    return [
      {
        metadata: {
          name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace: this.namespace.element.metadata.name,
        },
        spec: {
          selector,
          type: 'NodePort',
          port: [this.metadata.shared.services.sftp.ports.sftp],
        },
      },
      { selector },
    ];
  });

  sftpDeployment = this.provide(DeploymentV1, 'sftpDeployment', id => {
    const sftpDataDirName = 'data';
    const sftpDataDirContainerPath = path.join(
      'home',
      this.config.sftp.userName,
      sftpDataDirName,
    );
    const sftpHostKeyBackupDirContainerPath = path.join('etc', 'ssh-backup');

    return {
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
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
                name: this.metadata.shared.services.sftp.ports.sftp.name,
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
                      this.metadata.shared.services.sftp.ports.sftp.port,
                    protocol:
                      this.metadata.shared.services.sftp.ports.sftp.protocol,
                  },
                ],
                volumeMount: [
                  {
                    name: this.sharedFilesPersistentVolumeClaim.element.metadata
                      .name,
                    mountPath: sftpDataDirContainerPath,
                    subPath:
                      this.sharedFilesPersistentVolumeClaim.shared
                        .dataRootDirPath,
                  },
                  {
                    mountPath: `/home/${this.config.sftp.userName}/.ssh/keys`,
                    name: this.sftpAuthConfigMap.element.metadata.name,
                    readOnly: true,
                  },
                ],
              },
            ],
            volume: [
              {
                name: this.sharedFilesPersistentVolumeClaim.element.metadata
                  .name,
                persistentVolumeClaim: {
                  claimName:
                    this.sharedFilesPersistentVolumeClaim.element.metadata.name,
                },
              },
              {
                name: this.sftpAuthConfigMap.element.metadata.name,
                configMap: {
                  name: this.sftpAuthConfigMap.element.metadata.name,
                },
              },
            ],
          },
        },
      },
    };
  });

  // File Browser

  fileBrowserService = this.provide(ServiceV1, 'fileBrowserService', id => {
    const selector = {
      app: 'file-browser',
    };
    return [
      {
        metadata: {
          name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace: this.namespace.element.metadata.name,
        },
        spec: {
          selector,
          type: 'ClusterIP',
          port: [this.metadata.shared.services['file-browser'].ports.web],
        },
      },
      { selector },
    ];
  });

  fileBrowserDeployment = this.provide(
    DeploymentV1,
    'fileBrowserDeployment',
    id => {
      const fsGroup = '1000';
      return {
        metadata: {
          name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace: this.namespace.element.metadata.name,
        },
        spec: {
          replicas: '1',
          selector: {
            matchLabels: this.fileBrowserService.shared.selector,
          },
          template: {
            metadata: {
              labels: this.fileBrowserService.shared.selector,
            },
            spec: {
              securityContext: {
                fsGroup,
              },
              container: [
                {
                  name: this.metadata.shared.services['file-browser'].ports.web
                    .name,
                  image: 'filebrowser/filebrowser',
                  imagePullPolicy: 'Always',
                  port: [
                    {
                      containerPort:
                        this.metadata.shared.services['file-browser'].ports.web
                          .port,
                      protocol:
                        this.metadata.shared.services['file-browser'].ports.web
                          .protocol,
                    },
                  ],
                  securityContext: {
                    runAsUser: fsGroup,
                    runAsGroup: fsGroup,
                  },
                  volumeMount: [
                    {
                      name: this.sharedFilesPersistentVolumeClaim.element
                        .metadata.name,
                      mountPath: '/srv',
                      subPath:
                        this.sharedFilesPersistentVolumeClaim.shared
                          .dataRootDirPath,
                    },
                    {
                      name: this.fileBrowserConfigPersistentVolumeClaim.element
                        .metadata.name,
                      mountPath: '/database',
                      subPath: 'database',
                    },
                    {
                      name: this.fileBrowserConfigPersistentVolumeClaim.element
                        .metadata.name,
                      mountPath: '/config',
                      subPath: 'config',
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
                        this.metadata.shared.services['file-browser'].ports.web
                          .targetPort,
                    },
                  ],
                },
              ],
              volume: [
                {
                  name: this.sharedFilesPersistentVolumeClaim.element.metadata
                    .name,
                  persistentVolumeClaim: {
                    claimName:
                      this.sharedFilesPersistentVolumeClaim.element.metadata
                        .name,
                  },
                },
                {
                  name: this.fileBrowserConfigPersistentVolumeClaim.element
                    .metadata.name,
                  persistentVolumeClaim: {
                    claimName:
                      this.fileBrowserConfigPersistentVolumeClaim.element
                        .metadata.name,
                  },
                },
              ],
            },
          },
        },
      };
    },
  );

  filebrowserIngress = this.provide(IngressV1, 'filebrowserIngress', id => ({
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
                    name: this.fileBrowserService.element.metadata.name,
                    port: {
                      number:
                        this.metadata.shared.services['file-browser'].ports.web
                          .port,
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

  // Qbittorrent
  qbittorrentWebService = this.provide(
    ServiceV1,
    'qbittorrentWebService',
    id => {
      const selector = {
        app: 'qbittorrent',
      };
      return [
        {
          metadata: {
            name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
            namespace: this.namespace.element.metadata.name,
          },
          spec: {
            selector,
            type: 'ClusterIP',
            port: [this.metadata.shared.services.qbittorrent.ports.web],
          },
        },
        { selector },
      ];
    },
  );

  qbittorrentTorrentingService = this.provide(
    ServiceV1,
    'qbittorrentTorrentingService',
    id => ({
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      spec: {
        selector: this.qbittorrentWebService.shared.selector,
        type: 'NodePort',
        port: [
          this.metadata.shared.services.qbittorrent.ports['torrenting-tcp'],
          this.metadata.shared.services.qbittorrent.ports['torrenting-udp'],
        ],
      },
    }),
  );

  qbittorrentDeployment = this.provide(
    DeploymentV1,
    'qbittorrentDeployment',
    id => {
      const fsGroup = '1000';
      return {
        metadata: {
          name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace: this.namespace.element.metadata.name,
        },
        spec: {
          replicas: '1',
          selector: {
            matchLabels: this.qbittorrentWebService.shared.selector,
          },
          template: {
            metadata: {
              labels: {
                ...this.qbittorrentWebService.shared.selector,
                'sidecar.istio.io/inject': 'false',
              },
            },
            spec: {
              securityContext: {
                fsGroup,
              },
              initContainer: [
                {
                  name: 'init-sysctl',
                  image: 'busybox',
                  command: [
                    '/bin/sh',
                    '-c',
                    dedent`
                        sysctl -w net.ipv6.conf.all.disable_ipv6=1 &&
                        sysctl -w net.ipv4.conf.all.src_valid_mark=1
                    `,
                  ],
                  securityContext: {
                    privileged: true,
                  },
                },
              ],
              container: [
                {
                  name: 'nordlynx',
                  image: 'ghcr.io/bubuntux/nordlynx:latest',
                  imagePullPolicy: 'Always',
                  env: [
                    {
                      name: 'TZ',
                      value: 'Asia/Seoul',
                    },
                    {
                      name: 'NET_LOCAL',
                      value:
                        this.globalConfigService.config.terraform.stacks.k8s
                          .workstation.common.defaultCalcioIpv4IpPoolsCidrBlock,
                    },
                    {
                      name: 'ALLOW_LIST',
                      value: `${this.qbittorrentWebService.element.metadata.name}.${this.namespace.element.metadata.name}.svc.cluster.local`,
                    },
                    {
                      name: 'DNS',
                      value: '1.1.1.1,8.8.8.8',
                    },
                    {
                      name: 'PRIVATE_KEY',
                      valueFrom: {
                        secretKeyRef: {
                          name: this.nordLynxPrivateKeySecret.element.metadata
                            .name,
                          key: this.nordLynxPrivateKeySecret.shared.key,
                        },
                      },
                    },
                    {
                      name: 'QUERY',
                      value:
                        'filters\\[servers_groups\\]\\[identifier\\]=legacy_p2p',
                    },
                    {
                      name: 'COUNTRY_CODE',
                      // Japan
                      value: 'JP',
                    },
                  ],
                  securityContext: {
                    capabilities: {
                      add: ['NET_ADMIN'],
                    },
                  },
                },
                {
                  name: this.metadata.shared.services.qbittorrent.ports.web
                    .name,
                  image: 'lscr.io/linuxserver/qbittorrent:latest',
                  imagePullPolicy: 'Always',
                  port: [
                    {
                      containerPort:
                        this.metadata.shared.services.qbittorrent.ports.web
                          .port,
                      protocol:
                        this.metadata.shared.services.qbittorrent.ports.web
                          .protocol,
                    },
                    {
                      containerPort:
                        this.metadata.shared.services.qbittorrent.ports[
                          'torrenting-tcp'
                        ].port,
                      protocol:
                        this.metadata.shared.services.qbittorrent.ports[
                          'torrenting-tcp'
                        ].protocol,
                    },
                    {
                      containerPort:
                        this.metadata.shared.services.qbittorrent.ports[
                          'torrenting-udp'
                        ].port,
                      protocol:
                        this.metadata.shared.services.qbittorrent.ports[
                          'torrenting-udp'
                        ].protocol,
                    },
                  ],
                  env: [
                    {
                      name: 'PUID',
                      value: '1000',
                    },
                    {
                      name: 'PGID',
                      value: '1000',
                    },
                    {
                      name: 'TZ',
                      value: 'Asia/Seoul',
                    },
                    {
                      name: 'WEBUI_PORT',
                      value:
                        this.metadata.shared.services.qbittorrent.ports.web
                          .targetPort,
                    },
                    {
                      name: 'TORRENTING_PORT',
                      value:
                        this.metadata.shared.services.qbittorrent.ports[
                          'torrenting-tcp'
                        ].targetPort,
                    },
                    {
                      name: 'DOCKER_MODS',
                      value: 'ghcr.io/gabe565/linuxserver-mod-vuetorrent',
                    },
                  ],
                  volumeMount: [
                    {
                      name: this.sharedFilesPersistentVolumeClaim.element
                        .metadata.name,
                      mountPath: '/downloads',
                      subPath:
                        this.sharedFilesPersistentVolumeClaim.shared
                          .torrentDirPath,
                    },
                    {
                      name: this.qbittorrentConfigPersistentVolumeClaim.element
                        .metadata.name,
                      mountPath: '/config',
                    },
                    {
                      name: this
                        .qbittorrentIncompleteDownloadsPersistentVolumeClaim
                        .element.metadata.name,
                      mountPath: '/incomplete',
                    },
                  ],
                },
              ],
              volume: [
                {
                  name: this.sharedFilesPersistentVolumeClaim.element.metadata
                    .name,
                  persistentVolumeClaim: {
                    claimName:
                      this.sharedFilesPersistentVolumeClaim.element.metadata
                        .name,
                  },
                },
                {
                  name: this.qbittorrentConfigPersistentVolumeClaim.element
                    .metadata.name,
                  persistentVolumeClaim: {
                    claimName:
                      this.qbittorrentConfigPersistentVolumeClaim.element
                        .metadata.name,
                  },
                },
                {
                  name: this.qbittorrentIncompleteDownloadsPersistentVolumeClaim
                    .element.metadata.name,
                  persistentVolumeClaim: {
                    claimName:
                      this.qbittorrentIncompleteDownloadsPersistentVolumeClaim
                        .element.metadata.name,
                  },
                },
              ],
            },
          },
        },
      };
    },
  );

  qbittorrentIngress = this.provide(IngressV1, 'qbittorrentIngress', id => ({
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
      },
    },
    spec: {
      ingressClassName: 'nginx',
      rule: [
        {
          host: `${this.cloudflareRecordStack.torrentRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
          http: {
            path: [
              {
                path: '/',
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: this.qbittorrentWebService.element.metadata.name,
                    port: {
                      number:
                        this.metadata.shared.services.qbittorrent.ports.web
                          .port,
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

  // Jellyfin
  jellyfinRelease = this.provide(Release, 'jellyfinRelease', () => {
    return {
      name: this.metadata.shared.helm.jellyfin.name,
      chart: this.metadata.shared.helm.jellyfin.chart,
      repository: this.metadata.shared.helm.jellyfin.repository,
      namespace: this.namespace.element.metadata.name,
      createNamespace: false,
      values: [
        yaml.stringify({
          image: {
            pullPolicy: 'Always',
          },
          runtimeClassName: 'nvidia',
          ingress: {
            enabled: true,
            className: 'nginx',
            hosts: [
              {
                host: `${this.cloudflareRecordStack.jellyfinRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
                paths: [
                  {
                    path: '/',
                    pathType: 'ImplementationSpecific',
                  },
                ],
              },
            ],
          },
          persistence: {
            config: {
              existingClaim:
                this.jellyfinConfigPersistentVolumeClaim.element.metadata.name,
            },
            media: {
              existingClaim:
                this.sharedFilesPersistentVolumeClaim.element.metadata.name,
            },
          },
        }),
      ],
    };
  });

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
