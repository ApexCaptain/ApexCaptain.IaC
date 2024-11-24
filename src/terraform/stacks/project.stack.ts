import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { TerraformAppService } from '../terraform.app.service';
import { TerraformConfigService } from '../terraform.config.service';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { ActionsSecret } from '@lib/terraform/providers/github/actions-secret';
import { DataGithubRepository } from '@lib/terraform/providers/github/data-github-repository';
import { GithubProvider } from '@lib/terraform/providers/github/provider';

@Injectable()
export class Project_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBakcned.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      github: this.provide(GithubProvider, 'githubProvider', () =>
        this.terraformConfigService.providers.github.ApexCaptain(),
      ),
    },
  };

  dataIacRepository = this.provide(
    DataGithubRepository,
    'dataIacRepository',
    () => ({
      name: 'ApexCaptain.IaC',
    }),
  );

  workflowTokenSecret = this.provide(
    ActionsSecret,
    'workflowTokenSecret',
    () => ({
      repository: this.dataIacRepository.element.name,
      secretName: 'WORKFLOW_TOKEN',
      plaintextValue:
        this.globalConfigService.config.terraform.config.providers.github
          .ApexCaptain.token,
    }),
  );

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
  ) {
    super(terraformAppService.cdktfApp, Project_Stack.name, 'Project stack');
  }
}
