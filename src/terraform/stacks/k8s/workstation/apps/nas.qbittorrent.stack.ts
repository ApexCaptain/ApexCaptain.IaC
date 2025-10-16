import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import dedent from 'dedent';
import _ from 'lodash';
import { K8S_Workstation_Apps_Nas_Stack } from './nas.stack';
import { K8S_Oke_Apps_OAuth2Proxy_Stack } from '../../oke';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { DeploymentV1 } from '@lib/terraform/providers/kubernetes/deployment-v1';
import { IngressV1 } from '@lib/terraform/providers/kubernetes/ingress-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';

@Injectable()
export class K8S_Workstation_Apps_Nas_Qbittorrent_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      kubernetes: this.provide(KubernetesProvider, 'kubernetesProvider', () =>
        this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation(),
      ),
    },
  };

  nordLynxPrivateKeySecret = this.provide(
    SecretV1,
    'nordLynxPrivateKeySecret',
    id => {
      const key = 'nord-lynx-private-key';
      return [
        {
          metadata: {
            name: `${this.k8sWorkstationAppsNasStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
            namespace:
              this.k8sWorkstationAppsNasStack.namespace.element.metadata.name,
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

  qbittorrentService = this.provide(ServiceV1, 'qbittorrentService', () => {
    const selector = {
      app: 'qbittorrent',
    };
    return [
      {
        metadata: {
          name: this.k8sWorkstationAppsNasStack.metadata.shared.services
            .qbittorrent.name,
          namespace:
            this.k8sWorkstationAppsNasStack.namespace.element.metadata.name,
        },
        spec: {
          selector,
          type: 'ClusterIP',
          port: Object.values(
            this.k8sWorkstationAppsNasStack.metadata.shared.services.qbittorrent
              .ports,
          ),
        },
      },
      { selector },
    ];
  });

  qbittorrentDeployment = this.provide(
    DeploymentV1,
    'qbittorrentDeployment',
    id => {
      const fsGroup = '1000';
      return {
        metadata: {
          name: `${this.k8sWorkstationAppsNasStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace:
            this.k8sWorkstationAppsNasStack.namespace.element.metadata.name,
        },
        spec: {
          replicas: '1',
          selector: {
            matchLabels: this.qbittorrentService.shared.selector,
          },
          template: {
            metadata: {
              labels: {
                ...this.qbittorrentService.shared.selector,
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
                      value: `${this.qbittorrentService.element.metadata.name}.${this.k8sWorkstationAppsNasStack.namespace.element.metadata.name}.svc.cluster.local`,
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
                  name: this.k8sWorkstationAppsNasStack.metadata.shared.services
                    .qbittorrent.ports.web.name,
                  image: 'lscr.io/linuxserver/qbittorrent:latest',
                  imagePullPolicy: 'Always',
                  port: [
                    {
                      containerPort:
                        this.k8sWorkstationAppsNasStack.metadata.shared.services
                          .qbittorrent.ports.web.port,
                      protocol:
                        this.k8sWorkstationAppsNasStack.metadata.shared.services
                          .qbittorrent.ports.web.protocol,
                    },
                    {
                      containerPort:
                        this.k8sWorkstationAppsNasStack.metadata.shared.services
                          .qbittorrent.ports['torrenting-tcp'].port,
                      protocol:
                        this.k8sWorkstationAppsNasStack.metadata.shared.services
                          .qbittorrent.ports['torrenting-tcp'].protocol,
                    },
                    {
                      containerPort:
                        this.k8sWorkstationAppsNasStack.metadata.shared.services
                          .qbittorrent.ports['torrenting-udp'].port,
                      protocol:
                        this.k8sWorkstationAppsNasStack.metadata.shared.services
                          .qbittorrent.ports['torrenting-udp'].protocol,
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
                        this.k8sWorkstationAppsNasStack.metadata.shared.services
                          .qbittorrent.ports.web.targetPort,
                    },
                    {
                      name: 'TORRENTING_PORT',
                      value:
                        this.k8sWorkstationAppsNasStack.metadata.shared.services
                          .qbittorrent.ports['torrenting-tcp'].targetPort,
                    },
                    {
                      name: 'DOCKER_MODS',
                      value: 'ghcr.io/gabe565/linuxserver-mod-vuetorrent',
                    },
                  ],
                  volumeMount: [
                    {
                      name: this.k8sWorkstationAppsNasStack
                        .qbittorrentConfigPersistentVolumeClaim.element.metadata
                        .name,
                      mountPath: '/config',
                    },
                    {
                      name: this.k8sWorkstationAppsNasStack
                        .qbittorrentCompleteDownloadsPersistentVolumeClaim
                        .element.metadata.name,
                      mountPath: '/downloads',
                    },

                    {
                      name: this.k8sWorkstationAppsNasStack
                        .qbittorrentIncompleteDownloadsPersistentVolumeClaim
                        .element.metadata.name,
                      mountPath: '/incomplete',
                    },
                  ],
                },
              ],
              volume: [
                {
                  name: this.k8sWorkstationAppsNasStack
                    .qbittorrentConfigPersistentVolumeClaim.element.metadata
                    .name,
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
                        .qbittorrentCompleteDownloadsPersistentVolumeClaim
                        .element.metadata.name,
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
              ],
            },
          },
        },
      };
    },
  );

  qbittorrentIngress = this.provide(IngressV1, 'qbittorrentIngress', id => ({
    metadata: {
      name: `${this.k8sWorkstationAppsNasStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace:
        this.k8sWorkstationAppsNasStack.namespace.element.metadata.name,
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
          host: this.cloudflareRecordStack.torrentRecord.element.name,
          http: {
            path: [
              {
                path: '/',
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: this.qbittorrentService.element.metadata.name,
                    port: {
                      number:
                        this.k8sWorkstationAppsNasStack.metadata.shared.services
                          .qbittorrent.ports.web.port,
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
    private readonly k8sWorkstationAppsNasStack: K8S_Workstation_Apps_Nas_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
    private readonly k8sOkeAppsOAuth2ProxyStack: K8S_Oke_Apps_OAuth2Proxy_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Nas_Qbittorrent_Stack.name,
      'Nas Qbittorrent stack for workstation k8s',
    );
    this.addDependency(this.k8sOkeAppsOAuth2ProxyStack);
  }
}
