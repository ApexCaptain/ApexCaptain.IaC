import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { TerraformAppService } from '../terraform.app.service';
import { TerraformConfigService } from '../terraform.config.service';
import { AbstractStack, GithubRepositorySecretArgs } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { ActionsSecret } from '@lib/terraform/providers/github/actions-secret';
import { DataGithubRepository } from '@lib/terraform/providers/github/data-github-repository';
import { GithubProvider } from '@lib/terraform/providers/github/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { ActionsVariable } from '@lib/terraform/providers/github/actions-variable';
import { GoogleProvider } from '@lib/terraform/providers/google/provider';
import { flatten } from 'flat';
import { DataGoogleSqlDatabaseInstances } from '@lib/terraform/providers/google/data-google-sql-database-instances';

@Injectable()
export class Project_Stack extends AbstractStack {
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
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
    },
  };

  dataIacRepository = this.provide(
    DataGithubRepository,
    'dataIacRepository',
    () => ({
      name: 'ApexCaptain.IaC',
    }),
  );

  repositorySecretArgs = this.provide(Resource, 'repositorySecretArgs', id => {
    const secretArgs: GithubRepositorySecretArgs = {
      workflow: {
        token:
          this.globalConfigService.config.terraform.config.providers.github
            .ApexCaptain.token,
      },
    };

    const valueArgs: GithubRepositorySecretArgs = {};

    Object.entries(
      flatten<
        GithubRepositorySecretArgs,
        {
          [key: string]: string | number | boolean;
        }
      >(secretArgs, {
        delimiter: '_',
        transformKey: key => key.toUpperCase(),
      }),
    ).forEach(([key, value]) => {
      this.provide(ActionsSecret, `${id}-${key}`, () => ({
        repository: this.dataIacRepository.element.name,
        secretName: key,
        plaintextValue: value.toString(),
      }));
    });

    Object.entries(
      flatten<
        GithubRepositorySecretArgs,
        {
          [key: string]: string | number | boolean;
        }
      >(valueArgs, {
        delimiter: '_',
        transformKey: key => key.toUpperCase(),
      }),
    ).forEach(([key, value]) => {
      this.provide(ActionsVariable, `${id}-${key}`, () => ({
        repository: this.dataIacRepository.element.name,
        variableName: key,
        value: value.toString(),
      }));
    });

    return {};
  });

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
