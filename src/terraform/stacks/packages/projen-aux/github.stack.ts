import { Injectable } from '@nestjs/common';
import { CloudBackend } from 'cdktf';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Branch } from '@lib/terraform/providers/github/branch';
import { GithubProvider } from '@lib/terraform/providers/github/provider';
import { Repository } from '@lib/terraform/providers/github/repository';
import { DataVaultNamespaces } from '@lib/terraform/providers/vault/data-vault-namespaces';
import { VaultProvider } from '@lib/terraform/providers/vault/provider';
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
      vault: this.provide(VaultProvider, 'vaultProvider', () =>
        this.terraformConfigService.providers.vault[
          'ApexCaptain.IaC-DevContainer'
        ](),
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
  }));

  tmp = this.provide(DataVaultNamespaces, 'tmp', () => ({})).addOutput(
    id => `${id}-out`,
    ele => ({
      value: ele.paths,
      sensitive: true,
    }),
  );

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
