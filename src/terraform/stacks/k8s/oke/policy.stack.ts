import { AbstractStack, createOciPolicyStatement } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { OciProvider } from '@lib/terraform/providers/oci/provider';
import { Project_Stack } from '../../project.stack';
import { K8S_Oke_Compartment_Stack } from './compartment.stack';
import { IdentityDynamicGroup } from '@lib/terraform/providers/oci/identity-dynamic-group';
import { IdentityPolicy } from '@lib/terraform/providers/oci/identity-policy';

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

  // privateOciAppDeveloper = this.provide(
  //   Resource,
  //   'privateOciAppDeveloper',
  //   idPrefix => {
  //     const group = this.provide(IdentityGroup, `${idPrefix}-group`, id => ({
  //       compartmentId: this.projectStack.dataRootOciTenancy.element.id,
  //       description: 'Private OCI App Developer group',
  //       name: id,
  //     }));

  //     const user = this.provide(IdentityUser, `${idPrefix}-user`, id => ({
  //       compartmentId: this.projectStack.dataRootOciTenancy.element.id,
  //       description: 'Private OCI App Developer user',
  //       name: id,
  //     }));

  //     this.provide(
  //       IdentityUserGroupMembership,
  //       `${idPrefix}-userGroupMembership`,
  //       () => ({
  //         groupId: group.element.id,
  //         userId: user.element.id,
  //       }),
  //     );
  //     this.provide(
  //       IdentityUserCapabilitiesManagement,
  //       `${idPrefix}-userCapabilitiesManagement`,
  //       () => ({
  //         userId: user.element.id,
  //         // Caps
  //         canUseApiKeys: true,
  //         canUseAuthTokens: true,
  //         canUseConsolePassword: false,
  //         canUseCustomerSecretKeys: false,
  //         canUseSmtpCredentials: false,
  //       }),
  //     );

  //     const authToken = this.provide(
  //       IdentityAuthToken,
  //       `${idPrefix}-authToken`,
  //       () => ({
  //         description: 'Private OCI App Developer auth token',
  //         userId: user.element.id,
  //       }),
  //     );

  //     const privateKey = this.provide(
  //       PrivateKey,
  //       `${idPrefix}-privateKey`,
  //       () => ({
  //         algorithm: 'RSA',
  //         rsaBits: 4096,
  //       }),
  //     );

  //     const apiKey = this.provide(IdentityApiKey, `${idPrefix}-apiKey`, id => ({
  //       userId: user.element.id,
  //       keyValue: privateKey.element.publicKeyPem,
  //     }));

  //     const policy = this.provide(IdentityPolicy, `${idPrefix}-policy`, id => ({
  //       compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
  //       description: 'Private OCI App Developer policy',
  //       name: id,
  //       statements: [
  //         createOciPolicyStatement({
  //           subject: {
  //             type: 'group',
  //             targets: [group.element.name],
  //           },
  //           verb: 'manage',
  //           resourceType: 'repos',
  //           location: {
  //             type: 'compartment',
  //             expression:
  //               this.k8sOkeCompartmentStack.okeCompartment.element.name,
  //           },
  //           // condition: `any {target.repo.name='some-repo'}`,
  //           // allow group privateOciAppDeveloper-group to manage repos in compartment okeCompartment where all {target.repo.tag.Environment = 'Production'}
  //         }),
  //       ],
  //     }));

  //     return [{}, {}];
  //   },
  // );

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
