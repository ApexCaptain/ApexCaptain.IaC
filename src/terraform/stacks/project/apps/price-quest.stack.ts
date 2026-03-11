import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { Ocir_Stack } from '../../ocir.stack';
import { Project_Stack } from '../../project.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { ActionsSecret } from '@lib/terraform/providers/github/actions-secret';
import { ActionsVariable } from '@lib/terraform/providers/github/actions-variable';
import { Branch } from '@lib/terraform/providers/github/branch';
import { GithubProvider } from '@lib/terraform/providers/github/provider';
import { Repository } from '@lib/terraform/providers/github/repository';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class Project_Apps_PriceQuest_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      github: this.provide(GithubProvider, 'githubProvider', () =>
        this.terraformConfigService.providers.github.ApexCaptain(),
      ),
    },
  };

  priceQuestRepository = this.provide(
    Repository,
    'priceQuestRepository',
    () => ({
      name: 'price-quest',
      visibility: 'public',
      description: 'Price Quest Repository',
      autoInit: true,
      lifecycle: {
        preventDestroy: true,
      },
    }),
  );

  developBranch = this.provide(Branch, 'developBranch', () => ({
    repository: this.priceQuestRepository.element.name,
    branch: 'develop',
    lifecycle: {
      preventDestroy: true,
    },
  }));

  actionArgs = this.provide(Resource, 'actionArgs', id => {
    const containerRegistry = this.ocirStack.priceQuestContainerRepository;
    const ciResource = this.ocirStack.ciResource.shared;

    const secrets = {
      workflowToken:
        this.globalConfigService.config.terraform.config.providers.github
          .ApexCaptain.token,

      // OCI
      ociTenancyNamespace:
        this.projectStack.dataOciObjectstorageNamespace.element.namespace,
      ociCliUser: ciResource.user.element.id,
      ociCliUserName: ciResource.user.element.name,
      ociCliTenancy: this.projectStack.dataRootOciTenancy.element.id,
      ociCliFingerprint: ciResource.apiKey.element.fingerprint,
      ociCliKeyContent: ciResource.privateKey.element.privateKeyPem,
      ociCompartmentOcid: containerRegistry.element.compartmentId,
      ociAuthToken: ciResource.authToken.element.token,
    };

    const variables = {
      ociCliRegion:
        this.projectStack.dataOciHomeRegion.element.regionSubscriptions.get(0)
          .regionName,
      repoName: containerRegistry.element.displayName,
    };

    Object.entries<string>(secrets).forEach(([key, value]) => {
      const idPostFix = _.snakeCase(key).replace(/_/gi, '-');
      const secretName = _.snakeCase(key).toUpperCase();
      this.provide(ActionsSecret, `${id}-${idPostFix}`, () => ({
        repository: this.priceQuestRepository.element.name,
        secretName,
        plaintextValue: value,
      }));
    });

    Object.entries<string>(variables).forEach(([key, value]) => {
      const idPostFix = _.snakeCase(key).replace(/_/gi, '-');
      const variableName = _.snakeCase(key).toUpperCase();
      this.provide(ActionsVariable, `${id}-${idPostFix}`, () => ({
        repository: this.priceQuestRepository.element.name,
        variableName,
        value,
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

    // Stacks
    private readonly projectStack: Project_Stack,
    private readonly ocirStack: Ocir_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      Project_Apps_PriceQuest_Stack.name,
      'Project Apps Price Quest Stack',
    );
  }
}
