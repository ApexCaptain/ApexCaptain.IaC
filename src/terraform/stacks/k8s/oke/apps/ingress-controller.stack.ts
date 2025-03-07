import { AbstractStack, convertJsonToHelmSet } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { K8S_Oke_Network_Stack } from '../network.stack';

@Injectable()
export class K8S_Oke_Apps_IngressController_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
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

  meta = {
    name: 'ingress-controller',
  };

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.meta.name,
    },
  }));

  nginxIngressRelease = this.provide(Release, 'nginxIngressRelease', () => {
    const { helmSet, helmSetList } = convertJsonToHelmSet({
      controller: {
        service: {
          type: 'LoadBalancer',
          loadBalancerIP:
            this.k8sOkeNetworkStack
              .ingressControllerFlexibleLoadbalancerReservedPublicIp.element
              .ipAddress,
          nodePorts: {
            http: this.k8sOkeNetworkStack
              .ingressControllerFlexibleLoadbalancerReservedPublicIp.shared
              .httpNodePort,
            https:
              this.k8sOkeNetworkStack
                .ingressControllerFlexibleLoadbalancerReservedPublicIp.shared
                .httpsNodePort,
          },
          annotations: {
            'service\\.beta\\.kubernetes\\.io/oci-load-balancer-shape':
              'flexible',
            'service\\.beta\\.kubernetes\\.io/oci-load-balancer-shape-flex-min': 10,
            'service\\.beta\\.kubernetes\\.io/oci-load-balancer-shape-flex-max': 10,
          },
        },
      },
    });

    return {
      name: this.meta.name,
      chart: 'ingress-nginx',
      repository: 'https://kubernetes.github.io/ingress-nginx',
      namespace: this.namespace.element.metadata.name,
      createNamespace: false,

      setSensitive: helmSet,
      setList: helmSetList,
    };
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
      K8S_Oke_Apps_IngressController_Stack.name,
      'Ingress Controller for OKE k8s',
    );
  }
}
