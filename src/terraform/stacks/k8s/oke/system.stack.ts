import { AbstractStack, createK8sApplicationMetadata } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { Injectable } from '@nestjs/common';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { K8S_Oke_Endpoint_Stack } from './endpoint.stack';
import { DataKubernetesNamespaceV1 } from '@lib/terraform/providers/kubernetes/data-kubernetes-namespace-v1';
import { DataKubernetesServiceV1 } from '@lib/terraform/providers/kubernetes/data-kubernetes-service-v1';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { K8S_Oke_Network_Stack } from './network.stack';
import { K8S_Oke_Compartment_Stack } from './compartment.stack';
import { Project_Stack } from '../../project.stack';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';

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
        nfs: createK8sApplicationMetadata({
          namespace: 'nfs',
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
                  port: 11530,
                  targetPort: '11530',
                  protocol: 'TCP',
                },
              },
            },
          },
        }),

        fileBrowser: createK8sApplicationMetadata({
          namespace: 'file-browser',
          services: {
            fileBrowser: {
              name: 'file-browser',
              labels: {
                app: 'file-browser',
              },
              ports: {
                'file-browser': {
                  port: 80,
                  targetPort: '80',
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
      'OKE System Stack',
    );
  }
}
