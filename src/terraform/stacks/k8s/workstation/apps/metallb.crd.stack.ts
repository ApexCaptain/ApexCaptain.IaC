import { AbstractStack } from '@/common/abstract/abstract.stack';
import { Injectable } from '@nestjs/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { LocalBackend } from 'cdktf';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { K8S_Workstation_Apps_Metallb_Stack } from './metallb.stack';
import _ from 'lodash';
import { MetallbIpAddressPool, MetallbL2Advertisement } from '@/common';

@Injectable()
export class K8S_Workstation_Apps_Metallb_CRD_Stack extends AbstractStack {
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

  ipAddressPool = this.provide(MetallbIpAddressPool, 'ipAddressPool', id => {
    const name = `${this.k8sWorkstationAppsMetallbStack.namespace.element.metadata.name}-${_.kebabCase(id)}`;
    return [
      {
        manifest: {
          metadata: {
            name,
            namespace:
              this.k8sWorkstationAppsMetallbStack.namespace.element.metadata
                .name,
          },
          spec: {
            addresses: [
              this.k8sWorkstationAppsMetallbStack.config.loadbalancerIpRange,
            ],
          },
        },
      },
      {
        name,
      },
    ];
  });

  l2Advertisement = this.provide(
    MetallbL2Advertisement,
    'l2Advertisement',
    id => ({
      manifest: {
        metadata: {
          name: `${this.k8sWorkstationAppsMetallbStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace:
            this.k8sWorkstationAppsMetallbStack.namespace.element.metadata.name,
        },
        spec: {
          ipAddressPools: [this.ipAddressPool.shared.name],
        },
      },
    }),
  );

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationAppsMetallbStack: K8S_Workstation_Apps_Metallb_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Metallb_CRD_Stack.name,
      'Metallb CRD stack for workstation k8s',
    );
    this.addDependency(this.k8sWorkstationAppsMetallbStack);
  }
}
