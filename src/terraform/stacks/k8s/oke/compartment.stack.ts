import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Injectable } from '@nestjs/common';
import { K8S_Oke_Oci_Stack } from './oci.stack';
import { IdentityCompartment } from '@lib/terraform/providers/oci/identity-compartment';
import { OciProvider } from '@lib/terraform/providers/oci/provider';
import { LocalBackend } from 'cdktf';

@Injectable()
export class K8S_Oke_Compartment_Stack extends AbstractStack {
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

  okeCompartment = this.provide(IdentityCompartment, 'okeCompartment', id => ({
    compartmentId: this.k8sOkeOciStack.dataRootCompartment.element.id,
    name: id,
    description: 'Compartment for Oracle Kubernetes Engine Cluster',
    lifecycle: {
      preventDestroy: true,
    },
  }));

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeOciStack: K8S_Oke_Oci_Stack,
  ) {
    super(terraformAppService.cdktfApp, K8S_Oke_Compartment_Stack.name);
  }
}
