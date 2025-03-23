import { Injectable } from '@nestjs/common';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { LocalBackend } from 'cdktf';
import { K8S_Oke_Apps_Consul_Stack } from './consul.stack';
import { ConsulProvider } from '@lib/terraform/providers/consul/provider';

@Injectable()
export class K8S_Oke_Apps_ServiceMesh_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      consul: this.provide(ConsulProvider, 'consulProvider', () => ({
        address: this.k8sOkeAppsConsulStack.release.shared.ingressHost,
        token:
          this.k8sOkeAppsConsulStack.consulAclBootstrapToken.element.result,
      })),
    },
  };

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeAppsConsulStack: K8S_Oke_Apps_Consul_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_ServiceMesh_Stack.name,
      'Service Mesh stack for OKE k8s',
    );
    this.addDependency(this.k8sOkeAppsConsulStack);
  }
}
