import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { DataOciIdentityAvailabilityDomain } from '@lib/terraform/providers/oci/data-oci-identity-availability-domain';
import { DataOciIdentityCompartment } from '@lib/terraform/providers/oci/data-oci-identity-compartment';
import { DataOciIdentityRegionSubscriptions } from '@lib/terraform/providers/oci/data-oci-identity-region-subscriptions';
import { DataOciIdentityTenancy } from '@lib/terraform/providers/oci/data-oci-identity-tenancy';
import { OciProvider } from '@lib/terraform/providers/oci/provider';

@Injectable()
export class K8S_Oke_Oci_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      oci: this.provide(OciProvider, 'ociProvider', () =>
        this.terraformConfigService.providers.oci.ApexCaptain(),
      ),
    },
  };

  dataRootTenancy = this.provide(
    DataOciIdentityTenancy,
    'dataRootTenancy',
    () => ({
      tenancyId:
        this.globalConfigService.config.terraform.config.providers.oci
          .ApexCaptain.tenancyOcid,
    }),
  );

  dataHomeRegion = this.provide(
    DataOciIdentityRegionSubscriptions,
    'dataHomeRegion',
    () => ({
      filter: [
        {
          name: 'is_home_region',
          values: ['true'],
        },
      ],
      tenancyId: this.dataRootTenancy.element.id,
    }),
  );

  dataRootCompartment = this.provide(
    DataOciIdentityCompartment,
    'dataRootCompartment',
    () => ({
      id: this.globalConfigService.config.terraform.config.providers.oci
        .ApexCaptain.tenancyOcid,
    }),
  );

  dataAvailabilityDomain = this.provide(
    DataOciIdentityAvailabilityDomain,
    'dataAvailabilityDomain',
    () => ({
      compartmentId: this.dataRootCompartment.element.id,
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
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Oci_Stack.name,
      'OCI stack for OKE',
    );
  }
}
