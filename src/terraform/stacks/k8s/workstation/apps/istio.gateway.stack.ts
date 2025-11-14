import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Workstation_Apps_Istio_Stack } from './istio.stack';
import { AbstractStack, IstioGateway } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';

@Injectable()
export class K8S_Workstation_Apps_Istio_Gateway_Stack extends AbstractStack {
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

  // Cross-Netowrk
  istioCrossNetworkGateway = this.provide(
    IstioGateway,
    'istioCrossNetworkGateway',
    id => {
      const name = `${this.k8sWorkstationAppsIstioStack.namespace.element.metadata.name}-${_.kebabCase(id)}`;
      return {
        manifest: {
          metadata: {
            name,
            namespace:
              this.k8sWorkstationAppsIstioStack.namespace.element.metadata.name,
          },
          spec: {
            selector: {
              istio:
                this.k8sWorkstationAppsIstioStack.istioEastWestGatewayRelease
                  .shared.istioLabel,
            },
            servers: [
              {
                port: {
                  number: 15443,
                  name: 'tls',
                  protocol: 'TLS',
                },
                hosts: ['*.local'],
                tls: {
                  mode: 'AUTO_PASSTHROUGH' as const,
                },
              },
            ],
          },
        },
      };
    },
  );

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationAppsIstioStack: K8S_Workstation_Apps_Istio_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Istio_Gateway_Stack.name,
      'Istio Gateway stack for workstation k8s',
    );
    this.addDependency(this.k8sWorkstationAppsIstioStack);
  }
}
