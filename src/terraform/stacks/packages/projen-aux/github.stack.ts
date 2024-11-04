import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Branch } from '@lib/terraform/providers/github/branch';
import { GithubProvider } from '@lib/terraform/providers/github/provider';
import { Repository } from '@lib/terraform/providers/github/repository';
@Injectable()
export class Packages_ProjenAux_Github_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBakcned.secrets({
        stateId: this.id,
      }),
    ),
    providers: {
      github: this.provide(GithubProvider, 'githubProvider', () =>
        this.terraformConfigService.providers.github.ApexCaptain(),
      ),
    },
  };

  repository = this.provide(Repository, 'repository', () => ({
    name: 'projen-aux',
    description: 'Projen auxiliaries packages',
    visibility: 'public',
    autoInit: true,
    lifecycle: {
      preventDestroy: false,
    },
  }));

  developBranch = this.provide(Branch, 'developBranch', () => ({
    repository: this.repository.element.name,
    sourceBranch: 'main',
    branch: 'develop',
    lifecycle: {
      preventDestroy: false,
    },
  }));

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
