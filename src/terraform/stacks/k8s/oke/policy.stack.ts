import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { K8S_Oke_Compartment_Stack } from './compartment.stack';
import { Project_Stack } from '../../project.stack';
import { AbstractStack, createOciPolicyStatement } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { IdentityDynamicGroup } from '@lib/terraform/providers/oci/identity-dynamic-group';
import { IdentityPolicy } from '@lib/terraform/providers/oci/identity-policy';
import { OciProvider } from '@lib/terraform/providers/oci/provider';

@Injectable()
export class K8S_Oke_Policy_Stack extends AbstractStack {
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

  k8sInstanceDynamicGroup = this.provide(
    IdentityDynamicGroup,
    'k8sInstanceDynamicGroup',
    id => ({
      compartmentId: this.projectStack.dataRootOciTenancy.element.id,
      description: 'K8S Instance dynamic group',
      matchingRule: `instance.compartment.id = '${this.k8sOkeCompartmentStack.okeCompartment.element.id}'`,
      name: id,
    }),
  );

  k8sInstancePolicy = this.provide(IdentityPolicy, 'k8sInstancePolicy', id => ({
    compartmentId: this.projectStack.dataRootOciTenancy.element.id,
    description: 'K8S Instance policy',
    name: id,
    statements: [
      ...['keys', 'vaults'].map(resourceType =>
        createOciPolicyStatement({
          subject: {
            type: 'dynamic-group',
            targets: [this.k8sInstanceDynamicGroup.element.name],
          },
          verb: 'use',
          resourceType,
          location: {
            type: 'compartment',
            expression: this.k8sOkeCompartmentStack.okeCompartment.element.name,
          },
        }),
      ),
    ],
  }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly projectStack: Project_Stack,
    private readonly k8sOkeCompartmentStack: K8S_Oke_Compartment_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Policy_Stack.name,
      'K8S OKE Policy stack',
    );
  }
}
