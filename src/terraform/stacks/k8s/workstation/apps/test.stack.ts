import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import dedent from 'dedent';
import { K8S_Workstation_K8S_Stack } from '../k8s.stack';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { DeploymentV1 } from '@lib/terraform/providers/kubernetes/deployment-v1';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { PodV1 } from '@lib/terraform/providers/kubernetes/pod-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';

@Injectable()
export class K8S_Workstation_Apps_Test_Stack extends AbstractStack {
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
          configPath:
            this.k8sWorkstationK8SStack.kubeConfigFile.element.filename,
        }),
      ),
    },
  };

  // namespace = this.provide(NamespaceV1, 'namespace', () => ({
  //   metadata: {
  //     name: 'test',
  //   },
  // }));

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationK8SStack: K8S_Workstation_K8S_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Test_Stack.name,
      'Test stack for workstation k8s',
    );
  }
}
