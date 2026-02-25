import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { K8S_Workstation_K8S_Stack } from '../k8s.stack';

@Injectable()
export class K8S_Workstation_Apps_GitOps_Stack extends AbstractStack {
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

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationK8SStack: K8S_Workstation_K8S_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_GitOps_Stack.name,
      'GitOps stack for workstation k8s',
    );
  }
}
