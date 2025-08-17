import { AbstractStack } from '@/common';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { K8S_Workstation_Apps_Longhorn_Stack } from '../apps/longhorn.stack';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Resource } from '@lib/terraform/providers/null/resource';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { K8S_Workstation_System_Stack } from '../system.stack';

@Injectable()
export class K8S_Workstation_DevPods_ApexCaptain_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      local: this.provide(LocalProvider, 'localProvider', () => ({})),
      kubernetes: this.provide(KubernetesProvider, 'kubernetesProvider', () =>
        this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation(),
      ),
    },
  };

  // metadata = this.provide(Resource, 'metadata', () => [
  //   {},
  //   this.k8sWorkstationSystemStack.devPodsMetadata.shared.ApexCaptain,
  // ]);

  // namespace = this.provide(NamespaceV1, 'namespace', () => ({
  //   metadata: {
  //     name: this.metadata.shared.namespace,
  //   },
  // }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationLonghornStack: K8S_Workstation_Apps_Longhorn_Stack,
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_DevPods_ApexCaptain_Stack.name,
      'ApexCaptain dev-pod stack for workstation k8s',
    );
    this.addDependency(this.k8sWorkstationLonghornStack);
  }
}
