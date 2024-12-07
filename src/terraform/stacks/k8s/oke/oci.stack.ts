import { Injectable } from '@nestjs/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { AbstractStack } from '@/common';
import { LocalBackend } from 'cdktf';
import { DataOciIdentityCompartment } from '@lib/terraform/providers/oci/data-oci-identity-compartment';
import { DataOciIdentityTenancy } from '@lib/terraform/providers/oci/data-oci-identity-tenancy';
import { DataOciIdentityAvailabilityDomain } from '@lib/terraform/providers/oci/data-oci-identity-availability-domain';
import { OciProvider } from '@lib/terraform/providers/oci/provider';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';

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