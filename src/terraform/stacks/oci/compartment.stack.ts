import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { Oci_RootData_Stack } from './root-data.stack';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { IdentityCompartment } from '@lib/terraform/providers/oci/identity-compartment';
import { OciProvider } from '@lib/terraform/providers/oci/provider';

@Injectable()
export class Oci_Compartment_Stack extends AbstractStack {
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

  kubernetesCompartment = this.provide(
    IdentityCompartment,
    'kubernetesCompartment',
    id => ({
      compartmentId: this.ociRootDataStack.dataRootCompartment.element.id,
      name: id,
      description: `Kubernetes compartment`,
      lifecycle: {
        preventDestroy: true,
      },
    }),
  );

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly ociRootDataStack: Oci_RootData_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      Oci_Compartment_Stack.name,
      'OCI compartment stack',
    );
  }
}
