import { Injectable } from '@nestjs/common';
import { CloudBackend } from 'cdktf';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { DataKubernetesNodes } from '@lib/terraform/providers/kubernetes/data-kubernetes-nodes';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';

@Injectable()
export class K8S_Workstation_Service_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(CloudBackend, () =>
      this.terraformConfigService.backends.cloudBackend.ApexCaptain[
        'ApexCaptain-IaC'
      ]({
        type: 'name',
        name: this.id,
      }),
    ),
    providers: {
      kubernetes: this.provide(KubernetesProvider, 'kubernetesProvider', () =>
        this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation(),
      ),
    },
  };

  nodes = this.provide(DataKubernetesNodes, 'nodes', () => ({})).addOutput(
    id => `${id}-out`,
    ele => ({
      value: ele.nodes,
    }),
  );

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Service_Stack.name,
      'Test stack for k8s',
    );
  }
}
