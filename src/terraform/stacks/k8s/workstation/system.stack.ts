import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { AbstractStack, createK8sApplicationMetadata } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { DataKubernetesNamespace } from '@lib/terraform/providers/kubernetes/data-kubernetes-namespace';
import { DataKubernetesService } from '@lib/terraform/providers/kubernetes/data-kubernetes-service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { K8S_Workstation_NodeMeta_Stack } from './node-meta.stack';

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
    const metallbPorts = {
      nasSftp: 22,
    };

    const ports = Object.values(metallbPorts);
    if (ports.length != new Set(ports).size) {
      throw new Error('Metallb ports must be unique');
    }
    return metallbPorts;
  })();

  applicationMetadata = this.provide(Resource, 'applicationMetadata', () => {
    return [
      {},
      {
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
            // eastWestGateway: {
            //   name: 'east-west-gateway',
            //   chart: 'gateway',
            //   repository: 'https://istio-release.storage.googleapis.com/charts',
            // },
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
