import {
  AbstractStack,
  createK8sApplicationMetadata,
  OciNetworkProtocol,
} from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { LocalBackend } from 'cdktf';
import { Injectable } from '@nestjs/common';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { K8S_Oke_Endpoint_Stack } from './endpoint.stack';
import { DataKubernetesNamespaceV1 } from '@lib/terraform/providers/kubernetes/data-kubernetes-namespace-v1';
import { DataKubernetesServiceV1 } from '@lib/terraform/providers/kubernetes/data-kubernetes-service-v1';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { K8S_Oke_Network_Stack } from './network.stack';

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

        dashboard: createK8sApplicationMetadata({
          namespace: 'dashboard',
        }),

        consul: createK8sApplicationMetadata({
          namespace: 'consul',
          helm: {
            consul: {
              name: 'consul',
              chart: 'consul',
              repository: 'https://helm.releases.hashicorp.com',
            },
          },
          // services: {
          //   consulService: {
          //     name: 'consul-service',
          //     ports: {
          //       'consul-service': {
          //         portBasedIngressPort:
          //           this.k8sOkeNetworkStack.loadbalancerPortMappings
          //             .consulServerPort.inbound,
          //         protocol:
          //           this.k8sOkeNetworkStack.loadbalancerPortMappings
          //             .consulServerPort.protocol == OciNetworkProtocol.TCP
          //             ? 'TCP'
          //             : 'UDP',
          //         port: 8501,
          //       },
          //     },
          //   },
          // },
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
                  port: 11530,
                  targetPort: '11530',
                  protocol: 'TCP',
                },
              },
            },
          },
        }),

        /** @ToDo Consul Testing... */
        test: createK8sApplicationMetadata({
          namespace: 'test',
          services: {
            test: {
              name: 'test',
              labels: {
                app: 'test',
              },
              ports: {
                nginxWeb: {
                  portBasedIngressPort:
                    this.k8sOkeNetworkStack.loadbalancerPortMappings.testPort
                      .inbound,
                  protocol:
                    this.k8sOkeNetworkStack.loadbalancerPortMappings.testPort
                      .protocol == OciNetworkProtocol.TCP
                      ? 'TCP'
                      : 'UDP',
                  port: 18001,
                  targetPort: '8001',
                },
              },
            },
          },
        }),
        test2: createK8sApplicationMetadata({
          namespace: 'test2',
          services: {
            test2: {
              name: 'test2',
              labels: {
                app: 'test2',
              },
              ports: {
                nginxWeb: {
                  portBasedIngressPort:
                    this.k8sOkeNetworkStack.loadbalancerPortMappings.test2Port
                      .inbound,
                  protocol:
                    this.k8sOkeNetworkStack.loadbalancerPortMappings.test2Port
                      .protocol == OciNetworkProtocol.TCP
                      ? 'TCP'
                      : 'UDP',
                  port: 18002,
                  targetPort: '8002',
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
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeNetworkStack: K8S_Oke_Network_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_System_Stack.name,
      'OKE System Stack',
    );
  }
}
