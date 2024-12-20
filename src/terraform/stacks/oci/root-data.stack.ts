import { Injectable } from '@nestjs/common';

import { LocalBackend } from 'cdktf';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { DataOciIdentityCompartment } from '@lib/terraform/providers/oci/data-oci-identity-compartment';
import { DataOciIdentityTenancy } from '@lib/terraform/providers/oci/data-oci-identity-tenancy';
import { OciProvider } from '@lib/terraform/providers/oci/provider';

@Injectable()
export class Oci_RootData_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBakcned.secrets({
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

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
  ) {
    super(
      terraformAppService.cdktfApp,
      Oci_RootData_Stack.name,
      'OCI root data stack',
    );
  }
}
