import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { K8S_Workstation_NodeMeta_Stack } from './node-meta.stack';
import { AbstractStack, createK8sApplicationMetadata } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { DataKubernetesNamespace } from '@lib/terraform/providers/kubernetes/data-kubernetes-namespace';
import { DataKubernetesService } from '@lib/terraform/providers/kubernetes/data-kubernetes-service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Workstation_System_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      kubernetes: this.provide(KubernetesProvider, 'kubernetesProvider', () =>
        this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation(),
      ),
    },
  };

  dataNamespace = this.provide(DataKubernetesNamespace, 'namespace', () => ({
    metadata: {
      name: 'kube-system',
    },
  }));

  dataKubernetesDashboardService = this.provide(
    DataKubernetesService,
    'dataKubernetesDashboardService',
    () => [
      {
        metadata: {
          name: 'kubernetes-dashboard',
          namespace: this.dataNamespace.element.metadata.name,
        },
      },
      {
        servicePort: 443,
      },
    ],
  );

  metallbPorts = (() => {
    const externalMetallbMinPortNumber = 8000;
    const externalMetallbMaxPortNumber = 30000;

    const internalMetallbMinPortNumber = 60000;
    const internalMetallbMaxPortNumber = 65535;

    const metallbPorts = {
      // NAS
      nasSftp: 10022,

      // Game
      game7dtdGamePort1: 26900,
      game7dtdGamePort2: 26901,
      game7dtdGamePort3: 26902,
      gameSftp: 10023,

      // Windows
      windowsRdp: 60000,
      windowsVnc: 60001,
    };

    const ports = Object.values(metallbPorts);
    if (ports.length != new Set(ports).size) {
      throw new Error('Metallb ports must be unique');
    }
    Object.entries(metallbPorts).forEach(([key, value]) => {
      if (
        (value >= externalMetallbMinPortNumber &&
          value <= externalMetallbMaxPortNumber) ||
        (value >= internalMetallbMinPortNumber &&
          value <= internalMetallbMaxPortNumber)
      ) {
        return;
      }
      throw new Error(
        `Metallb port ${value} of ${key} must be in range [${externalMetallbMinPortNumber}, ${externalMetallbMaxPortNumber}] or [${internalMetallbMinPortNumber}, ${internalMetallbMaxPortNumber}]`,
      );
    });
    return metallbPorts;
  })();

  applicationMetadata = this.provide(Resource, 'applicationMetadata', () => {
    return [
      {},
      {
        authentik: createK8sApplicationMetadata({
          namespace: 'authentik',
          helm: {
            'authentik-remote-cluster': {
              chart: 'authentik-remote-cluster',
              name: 'authentik-remote-cluster',
              repository: 'https://charts.goauthentik.io/',
            },
          },
        }),
        dashboard: createK8sApplicationMetadata({
          namespace: 'dashboard',
        }),
        certManager: createK8sApplicationMetadata({
          namespace: 'cert-manager',
          helm: {
            certManager: {
              name: 'cert-manager',
              chart: 'cert-manager',
              repository: 'https://charts.jetstack.io',
            },
          },
        }),

        metallb: createK8sApplicationMetadata({
          namespace: 'metallb-system',
          helm: {
            metallb: {
              name: 'metallb',
              chart: 'metallb',
              repository: 'https://metallb.github.io/metallb',
            },
          },
        }),

        istio: createK8sApplicationMetadata({
          namespace: 'istio-system',
          helm: {
            istiod: {
              name: 'istiod',
              chart: 'istiod',
              repository: 'https://istio-release.storage.googleapis.com/charts',
            },
            base: {
              name: 'istio-base',
              chart: 'base',
              repository: 'https://istio-release.storage.googleapis.com/charts',
            },
            istioEastWestGateway: {
              name: 'istio-eastwestgateway',
              chart: 'gateway',
              repository: 'https://istio-release.storage.googleapis.com/charts',
            },
          },
        }),

        ingressController: createK8sApplicationMetadata({
          namespace: 'ingress-controller',
          helm: {
            ingressController: {
              name: 'ingress-controller',
              chart: 'ingress-nginx',
              repository: 'https://kubernetes.github.io/ingress-nginx',
            },
          },
        }),

        longhorn: createK8sApplicationMetadata({
          namespace: 'longhorn-system',
          helm: {
            longhorn: {
              name: 'longhorn',
              chart: 'longhorn',
              repository: 'https://charts.longhorn.io',
            },
          },
        }),

        monitoring: createK8sApplicationMetadata({
          namespace: 'monitoring',
          helm: {
            kubePrometheusStack: {
              name: 'kube-prometheus-stack',
              chart: 'kube-prometheus-stack',
              repository: 'https://prometheus-community.github.io/helm-charts',
            },
            lokiStack: {
              name: 'loki-stack',
              chart: 'loki-stack',
              repository: 'https://grafana.github.io/helm-charts',
            },
          },
        }),

        nas: createK8sApplicationMetadata({
          namespace: 'nas',
          helm: {
            jellyfin: {
              name: 'jellyfin',
              chart: 'jellyfin',
              repository: 'https://jellyfin.github.io/jellyfin-helm',
            },
          },
          services: {
            sftp: {
              name: 'sftp',
              ports: {
                sftp: {
                  portBasedIngressPort: this.metallbPorts.nasSftp,
                  name: 'sftp',
                  port: 22,
                  targetPort: '22',
                  protocol: 'TCP',
                },
              },
            },
            qbittorrent: {
              name: 'qbittorrent',
              ports: {
                web: {
                  name: 'web',
                  port: 8080,
                  targetPort: '8080',
                  protocol: 'TCP',
                },
                'torrenting-tcp': {
                  name: 'torrenting-tcp',
                  port: 6881,
                  targetPort: '6881',
                  protocol: 'TCP',
                },
                'torrenting-udp': {
                  name: 'torrenting-udp',
                  port: 6881,
                  targetPort: '6881',
                  protocol: 'UDP',
                },
              },
            },
          },
        }),
        game: createK8sApplicationMetadata({
          namespace: 'game',
          services: {
            '7dtd': {
              name: 'sdtd',
              ports: {
                dashboard: {
                  name: 'dashboard',
                  port: 8080,
                  targetPort: '8080',
                  protocol: 'TCP',
                },
                tcpGamePort1: {
                  portBasedIngressPort: this.metallbPorts.game7dtdGamePort1,
                  name: 'tcp-game-port-1',
                  port: 26900,
                  targetPort: '26900',
                  protocol: 'TCP',
                },
                udpGamePort1: {
                  portBasedIngressPort: this.metallbPorts.game7dtdGamePort1,
                  name: 'udp-game-port-1',
                  port: 26900,
                  targetPort: '26900',
                  protocol: 'UDP',
                },
                udpGamePort2: {
                  portBasedIngressPort: this.metallbPorts.game7dtdGamePort2,
                  name: 'udp-game-port-2',
                  port: 26901,
                  targetPort: '26901',
                  protocol: 'UDP',
                },
                udpGamePort3: {
                  portBasedIngressPort: this.metallbPorts.game7dtdGamePort3,
                  name: 'udp-game-port-3',
                  port: 26902,
                  targetPort: '26902',
                  protocol: 'UDP',
                },
              },
            },
            sftp: {
              name: 'sftp',
              ports: {
                sftp: {
                  portBasedIngressPort: this.metallbPorts.gameSftp,
                  name: 'sftp',
                  port: 22,
                  targetPort: '22',
                  protocol: 'TCP',
                },
              },
            },
          },
        }),
        windows: createK8sApplicationMetadata({
          namespace: 'windows',
          services: {
            windows: {
              labels: {
                app: 'windows',
              },
              name: 'windows',
              ports: {
                http: {
                  name: 'http',
                  port: 8006,
                  targetPort: '8006',
                  protocol: 'TCP',
                },
                'rdp-tcp': {
                  portBasedIngressPort: this.metallbPorts.windowsRdp,
                  name: 'rdp-tcp',
                  port: 3389,
                  targetPort: '3389',
                  protocol: 'TCP',
                },
                'rdp-udp': {
                  portBasedIngressPort: this.metallbPorts.windowsRdp,
                  name: 'rdp-udp',
                  port: 3389,
                  targetPort: '3389',
                  protocol: 'UDP',
                },
                vnc: {
                  portBasedIngressPort: this.metallbPorts.windowsVnc,
                  name: 'vnc',
                  port: 5900,
                  targetPort: '5900',
                  protocol: 'TCP',
                },
              },
            },
          },
        }),

        ollama: createK8sApplicationMetadata({
          namespace: 'ollama',
          helm: {
            ollama: {
              name: 'ollama',
              chart: 'ollama',
              repository: 'https://otwld.github.io/ollama-helm/',
            },
          },
        }),

        openWebUi: createK8sApplicationMetadata({
          namespace: 'open-webui',
          helm: {
            openWebui: {
              name: 'open-webui',
              chart: 'open-webui',
              repository: 'https://helm.openwebui.com/',
            },
          },
        }),
      },
    ];
  });

  devPodsMetadata = this.provide(Resource, 'devPodsMetadata', () => {
    // 이 부분은 아직 schema가 명확히 정해져 있지 않고, 현재로서 home cluster에서 devpod 사용자는 나밖에 없으니 dynamic 하게 처리함.
    // 추후 회사 k8s에 devpod를 도입하게 될 경우 재고 필요.
    const namespacePrefix = 'devpod';
    return [
      {},
      {
        ApexCaptain: {
          namespace: `${namespacePrefix}-apex-captain`,
        },
      },
    ];
  });

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationNodeMetaStack: K8S_Workstation_NodeMeta_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_System_Stack.name,
      'System stack for workstation k8s',
    );
    this.addDependency(this.k8sWorkstationNodeMetaStack);
  }
}
