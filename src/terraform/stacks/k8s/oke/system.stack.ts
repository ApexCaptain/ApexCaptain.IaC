import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Oke_Compartment_Stack } from './compartment.stack';
import { K8S_Oke_Endpoint_Stack } from './endpoint.stack';
import { K8S_Oke_Network_Stack } from './network.stack';
import { Project_Stack } from '../../project.stack';
import {
  AbstractStack,
  createK8sApplicationMetadata,
  OciNetworkProtocol,
} from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { DataKubernetesNamespaceV1 } from '@lib/terraform/providers/kubernetes/data-kubernetes-namespace-v1';
import { DataKubernetesServiceV1 } from '@lib/terraform/providers/kubernetes/data-kubernetes-service-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Oke_System_Stack extends AbstractStack {
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
    },
  };

  dataNamespace = this.provide(DataKubernetesNamespaceV1, 'namespace', () => ({
    metadata: {
      name: 'kube-system',
    },
  }));

  dataKubernetesDashboardService = this.provide(
    DataKubernetesServiceV1,
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

  applicationMetadata = this.provide(Resource, 'applicationMetadata', () => {
    return [
      {},
      {
        authentik: createK8sApplicationMetadata({
          namespace: 'authentik',
          helm: {
            authentik: {
              name: 'authentik',
              chart: 'authentik',
              repository: 'https://charts.goauthentik.io',
            },
          },
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

        argoCd: createK8sApplicationMetadata({
          namespace: 'argocd',
          helm: {
            argoCd: {
              name: 'argo-cd',
              chart: 'argo-cd',
              repository: 'https://argoproj.github.io/argo-helm',
            },
            argoCdImageUpdater: {
              name: 'argocd-image-updater',
              chart: 'argocd-image-updater',
              repository: 'https://argoproj.github.io/argo-helm',
            },
          },
        }),

        metricsServer: createK8sApplicationMetadata({
          namespace: 'metrics-server',
          helm: {
            metricsServer: {
              name: 'metrics-server',
              chart: 'metrics-server',
              repository: 'https://kubernetes-sigs.github.io/metrics-server',
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

        kialiOperator: createK8sApplicationMetadata({
          namespace: 'kiali-operator',
          helm: {
            kialiOperator: {
              name: 'kiali-operator',
              chart: 'kiali-operator',
              repository: 'https://kiali.org/helm-charts',
            },
          },
        }),

        nfs: createK8sApplicationMetadata({
          namespace: 'nfs',
          helm: {
            'nfs-subdir-external-provisioner': {
              name: 'nfs-subdir-external-provisioner',
              chart: 'nfs-subdir-external-provisioner',
              repository:
                'https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner',
            },
          },
          services: {
            nfs: {
              name: 'nfs',
              labels: {
                app: 'nfs',
              },
              ports: {
                nfs: {
                  name: 'nfs',
                  port: 2049,
                  targetPort: '2049',
                  protocol: 'TCP',
                },
                'file-browser': {
                  name: 'file-browser',
                  port: 80,
                  targetPort: '8080',
                  protocol: 'TCP',
                },
                sftp: {
                  portBasedIngressPort:
                    this.k8sOkeNetworkStack.loadbalancerPortMappings.nfsSftpPort
                      .inbound,
                  name: 'sftp',
                  port: 22,
                  targetPort: '22',
                  protocol:
                    this.k8sOkeNetworkStack.loadbalancerPortMappings.nfsSftpPort
                      .protocol === OciNetworkProtocol.TCP
                      ? 'TCP'
                      : 'UDP',
                },
              },
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

        oauth2Proxy: createK8sApplicationMetadata({
          namespace: 'oauth2-proxy',
          helm: {
            oauth2Proxy: {
              name: 'oauth2-proxy',
              chart: 'oauth2-proxy',
              repository: 'https://oauth2-proxy.github.io/manifests',
            },
          },
        }),

        vault: createK8sApplicationMetadata({
          namespace: 'vault',
          helm: {
            vault: {
              name: 'vault',
              chart: 'vault',
              repository: 'https://helm.releases.hashicorp.com',
            },
          },
        }),

        dashboard: createK8sApplicationMetadata({
          namespace: 'dashboard',
        }),

        homeL2tpVpnProxy: createK8sApplicationMetadata({
          namespace: 'home-l2tp-vpn-proxy',
          services: {
            vpn: {
              name: 'home-l2tp-vpn-proxy',
              labels: {
                app: 'home-l2tp-vpn-proxy',
              },
              ports: {
                'home-l2tp-vpn-proxy': {
                  name: 'home-l2tp-vpn-proxy',
                  port: 11530,
                  targetPort: '11530',
                  protocol: 'TCP',
                },
              },
            },
          },
        }),

        cloudbeaver: createK8sApplicationMetadata({
          namespace: 'cloudbeaver',
          services: {
            cloudbeaver: {
              name: 'cloudbeaver',
              labels: {
                app: 'cloudbeaver',
              },
              ports: {
                cloudbeaver: {
                  name: 'cloudbeaver',
                  port: 8978,
                  targetPort: '8978',
                  protocol: 'TCP',
                },
              },
            },
          },
        }),
        redisUi: createK8sApplicationMetadata({
          namespace: 'redis-ui',
          services: {
            redisUi: {
              name: 'redis-ui',
              labels: {
                app: 'redis-ui',
              },
              ports: {
                redisUi: {
                  name: 'redis-ui',
                  port: 7843,
                  targetPort: '7843',
                  protocol: 'TCP',
                },
              },
            },
          },
        }),
      },
    ];
  });

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly projectStack: Project_Stack,
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeCompartmentStack: K8S_Oke_Compartment_Stack,
    private readonly k8sOkeNetworkStack: K8S_Oke_Network_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_System_Stack.name,
      'K8S OKE System Stack',
    );
  }
}
