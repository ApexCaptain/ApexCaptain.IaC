import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { GoogleProvider } from '@lib/terraform/providers/google/provider';
import { Google_Project_Stack } from './project.stack';
@Injectable()
export class Google_IdentityPlatform_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      google: this.provide(GoogleProvider, 'googleProvider', () =>
        this.terraformConfigService.providers.google.ApexCaptain(),
      ),
    },
  };

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly googleProjectStack: Google_Project_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      Google_IdentityPlatform_Stack.name,
      'Google identity platform stack',
    );
  }
}
