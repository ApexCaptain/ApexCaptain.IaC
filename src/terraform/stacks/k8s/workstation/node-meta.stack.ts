import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { K8S_Workstation_K8S_Stack } from './k8s.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Labels } from '@lib/terraform/providers/kubernetes/labels';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';

@Injectable()
export class K8S_Workstation_NodeMeta_Stack extends AbstractStack {
  config =
    this.globalConfigService.config.terraform.stacks.k8s.workstation.nodeMeta;

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
          configPath:
            this.k8sWorkstationK8SStack.kubeConfigFile.element.filename,
        }),
      ),
    },
  };

  node0Labels = this.provide(Labels, 'node0Labels', () => ({
    apiVersion: 'v1',
    kind: 'Node',
    metadata: {
      name: this.config.node0.name,
    },
    labels: {
      'sysbox-install': 'yes',
    },
  }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationK8SStack: K8S_Workstation_K8S_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_NodeMeta_Stack.name,
      'Node meta stack for workstation k8s',
    );
  }
}
