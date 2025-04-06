import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
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
import { flatten } from 'flat';
import { OciProvider } from '@lib/terraform/providers/oci/provider';
import { DataOciIdentityAvailabilityDomain } from '@lib/terraform/providers/oci/data-oci-identity-availability-domain';
import { DataOciIdentityCompartment } from '@lib/terraform/providers/oci/data-oci-identity-compartment';
import { DataOciIdentityRegionSubscriptions } from '@lib/terraform/providers/oci/data-oci-identity-region-subscriptions';
import { DataOciIdentityTenancy } from '@lib/terraform/providers/oci/data-oci-identity-tenancy';
import { DataOciObjectstorageNamespace } from '@lib/terraform/providers/oci/data-oci-objectstorage-namespace';
import { IdentityCustomerSecretKey } from '@lib/terraform/providers/oci/identity-customer-secret-key';

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
      oci: this.provide(OciProvider, 'ociProvider', () =>
        this.terraformConfigService.providers.oci.ApexCaptain(),
      ),
    },
  };

  dataIacGithubRepository = this.provide(
    DataGithubRepository,
    'dataIacGithubRepository',
    () => ({
      name: 'ApexCaptain.IaC',
    }),
  );

  iacGithubRepositorySecretArgs = this.provide(
    Resource,
    'iacGithubRepositorySecretArgs',
    id => {
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
          repository: this.dataIacGithubRepository.element.name,
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
          repository: this.dataIacGithubRepository.element.name,
          variableName: key,
          value: value.toString(),
        }));
      });

      return {};
    },
  );

  dataRootOciTenancy = this.provide(
    DataOciIdentityTenancy,
    'dataRootOciTenancy',
    () => ({
      tenancyId:
        this.globalConfigService.config.terraform.config.providers.oci
          .ApexCaptain.tenancyOcid,
    }),
  );

  dataOciHomeRegion = this.provide(
    DataOciIdentityRegionSubscriptions,
    'dataOciHomeRegion',
    () => ({
      filter: [
        {
          name: 'is_home_region',
          values: ['true'],
        },
      ],
      tenancyId: this.dataRootOciTenancy.element.id,
    }),
  );

  dataOciRootCompartment = this.provide(
    DataOciIdentityCompartment,
    'dataOciRootCompartment',
    () => ({
      id: this.globalConfigService.config.terraform.config.providers.oci
        .ApexCaptain.tenancyOcid,
    }),
  );

  dataOciAvailabilityDomain = this.provide(
    DataOciIdentityAvailabilityDomain,
    'dataOciAvailabilityDomain',
    () => ({
      compartmentId: this.dataOciRootCompartment.element.id,
      adNumber: 1,
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
