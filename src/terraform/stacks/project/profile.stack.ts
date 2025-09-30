import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { GithubProvider } from '@lib/terraform/providers/github/provider';
import { Repository } from '@lib/terraform/providers/github/repository';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';

@Injectable()
export class Project_Profile_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      github: this.provide(GithubProvider, 'githubProvider', () =>
        this.terraformConfigService.providers.github.ApexCaptain(),
      ),
    },
  };

  profileRepository = this.provide(Repository, 'profileRepository', () => ({
    name: this.globalConfigService.config.terraform.config.providers.github
      .ApexCaptain.owner,
    visibility: 'public',
    autoInit: true,
  }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
  ) {
    super(
      terraformAppService.cdktfApp,
      Project_Profile_Stack.name,
      'Project profile stack',
    );
  }
}
