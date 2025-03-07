import { Injectable } from '@nestjs/common';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { LocalBackend } from 'cdktf';
import { GoogleProvider } from '@lib/terraform/providers/google/provider';
import { Project } from '@lib/terraform/providers/google/project';
import _ from 'lodash';

@Injectable()
export class Google_Project_Stack extends AbstractStack {
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

  apexCaptainIacProject = this.provide(
    Project,
    'apexCaptainIacProject',
    id => ({
      name: 'ApexCaptain-IaC',
      projectId: _.kebabCase(id),
      lifecycle: {
        preventDestroy: true,
      },
    }),
  );

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
  ) {
    super(
      terraformAppService.cdktfApp,
      Google_Project_Stack.name,
      'Google project stack',
    );
  }
}
