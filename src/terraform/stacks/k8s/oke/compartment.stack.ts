import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { IdentityCompartment } from '@lib/terraform/providers/oci/identity-compartment';
import { OciProvider } from '@lib/terraform/providers/oci/provider';
import { Project_Stack } from '../../project.stack';

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
    compartmentId: this.projectStack.dataOciRootCompartment.element.id,
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
    private readonly projectStack: Project_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Compartment_Stack.name,
      'K8S OKE Compartment Stack',
    );
  }
}
