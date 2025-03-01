import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { Namespace } from '@lib/terraform/providers/kubernetes/namespace';
import { K8S_Oke_Network_Stack } from '../network.stack';

@Injectable()
export class K8S_Oke_Apps_Ingress_Controller_Stack extends AbstractStack {
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

  namespace = this.provide(Namespace, 'namespace', () => ({
    metadata: {
      name: this.meta.name,
    },
  }));

  nginxIngressRelease = this.provide(Release, 'nginxIngressRelease', () => ({
    name: this.meta.name,
    chart: 'ingress-nginx',
    repository: 'https://kubernetes.github.io/ingress-nginx',
    namespace: this.namespace.element.metadata.name,
    version: '4.12.0',
    set: [
      {
        name: 'controller.service.type',
        value: 'LoadBalancer',
      },
      {
        name: 'controller.service.loadBalancerIP',
        value:
          this.k8sOkeNetworkStack
            .ingressControllerFlexibleLoadbalancerReservedPublicIp.element
            .ipAddress,
      },
      {
        name: 'controller.service.annotations.service\\.beta\\.kubernetes\\.io/oci-load-balancer-shape',
        value: 'flexible',
      },
      {
        name: 'controller.service.annotations.service\\.beta\\.kubernetes\\.io/oci-load-balancer-shape-flex-min',
        value: '10',
      },
      {
        name: 'controller.service.annotations.service\\.beta\\.kubernetes\\.io/oci-load-balancer-shape-flex-max',
        value: '10',
      },
    ],
  }));

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeNetworkStack: K8S_Oke_Network_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Ingress_Controller_Stack.name,
      'Ingress Controller for OKE k8s',
    );
  }
}
