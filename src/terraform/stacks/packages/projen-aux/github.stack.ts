import { Injectable } from '@nestjs/common';
import { CloudBackend, TerraformDataSource } from 'cdktf';
import { TerraformInjectorElementContainerAsync } from 'cdktf-injector';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { GithubProvider } from '@lib/terraform/providers/github/provider';

@Injectable()
export class Packages_ProjenAux_Github_Stack extends AbstractStack {
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
      github: this.provide(GithubProvider, 'githubProvider', () =>
        this.terraformConfigService.providers.github.ApexCaptain(),
      ),
    },
  };

  data = {};

  resources = {};

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
  ) {
    super(
      terraformAppService.cdktfApp,
      Packages_ProjenAux_Github_Stack.name,
      'GitHub Stack for projen-aux project',
    );
  }
}
