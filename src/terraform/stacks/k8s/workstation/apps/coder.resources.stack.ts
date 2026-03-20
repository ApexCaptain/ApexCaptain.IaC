import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { K8S_Workstation_Apps_Coder_Stack } from './coder.stack';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { CoderdProvider } from '@lib/terraform/providers/coderd/provider';
import { User } from '@lib/terraform/providers/coderd/user';

@Injectable()
export class K8S_Workstation_Apps_Coder_Resources_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      coderd: this.provide(
        CoderdProvider,
        'coderdProvider',
        () =>
          this.k8sWorkstationAppsCoderStack.cdktfCoderdProviderConfig.shared,
      ),
    },
  };

  apexCaptainUser = this.provide(User, 'apexCaptainUser', () => ({
    email: this.k8sWorkstationAppsCoderStack.config.users.apexCaptain.email,
    username:
      this.k8sWorkstationAppsCoderStack.config.users.apexCaptain.username,
    loginType: 'github',
  }));

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationAppsCoderStack: K8S_Workstation_Apps_Coder_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Coder_Resources_Stack.name,
      'K8S Workstation Apps Coder Resources Stack',
    );
    this.addDependency(this.k8sWorkstationAppsCoderStack);
  }
}
