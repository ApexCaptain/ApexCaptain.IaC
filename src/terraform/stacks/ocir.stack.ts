import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { Project_Stack } from './project.stack';
import { TerraformAppService } from '../terraform.app.service';
import { TerraformConfigService } from '../terraform.config.service';
import {
  AbstractStack,
  createExpirationInterval,
  createOciPolicyStatement,
} from '@/common';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { ArtifactsContainerRepository } from '@lib/terraform/providers/oci/artifacts-container-repository';
import { IdentityApiKey } from '@lib/terraform/providers/oci/identity-api-key';
import { IdentityAuthToken } from '@lib/terraform/providers/oci/identity-auth-token';
import { IdentityCompartment } from '@lib/terraform/providers/oci/identity-compartment';
import { IdentityGroup } from '@lib/terraform/providers/oci/identity-group';
import { IdentityPolicy } from '@lib/terraform/providers/oci/identity-policy';
import { IdentityUser } from '@lib/terraform/providers/oci/identity-user';
import { IdentityUserCapabilitiesManagement } from '@lib/terraform/providers/oci/identity-user-capabilities-management';
import { IdentityUserGroupMembership } from '@lib/terraform/providers/oci/identity-user-group-membership';
import { OciProvider } from '@lib/terraform/providers/oci/provider';
import { TimeProvider } from '@lib/terraform/providers/time/provider';
import { StaticResource } from '@lib/terraform/providers/time/static-resource';
import { PrivateKey } from '@lib/terraform/providers/tls/private-key';
import { TlsProvider } from '@lib/terraform/providers/tls/provider';

@Injectable()
export class Ocir_Stack extends AbstractStack {
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
      tls: this.provide(TlsProvider, 'tlsProvider', () => ({})),
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      time: this.provide(TimeProvider, 'timeProvider', () => ({})),
    },
  };

  ocirCompartment = this.provide(
    IdentityCompartment,
    'ocirCompartment',
    id => ({
      compartmentId: this.projectStack.dataOciRootCompartment.element.id,
      name: id,
      description: 'Compartment for Ocir',
      lifecycle: {
        preventDestroy: true,
      },
    }),
  );

  cicdSecretExpiration = this.provide(
    StaticResource,
    `cicdSecretExpiration`,
    () => ({
      triggers: {
        expirationDate: createExpirationInterval({
          days: 15,
        }).toString(),
      },
    }),
  );

  ciResource = this.provide(Resource, 'ciResource', idPrefix => {
    const secretExpirationElement = this.cicdSecretExpiration.element;
    const group = this.provide(IdentityGroup, `${idPrefix}-group`, id => ({
      compartmentId: this.projectStack.dataOciRootCompartment.element.id,
      description: `Continuous Integration Resource Group`,
      name: id,
    }));

    const user = this.provide(IdentityUser, `${idPrefix}-user`, id => ({
      compartmentId: this.projectStack.dataOciRootCompartment.element.id,
      description: `Continuous Integration Resource User`,
      name: id,
    }));

    this.provide(
      IdentityUserGroupMembership,
      `${idPrefix}-userGroupMembership`,
      () => ({
        groupId: group.element.id,
        userId: user.element.id,
      }),
    );

    this.provide(
      IdentityUserCapabilitiesManagement,
      `${idPrefix}-userCapabilitiesManagement`,
      () => ({
        userId: user.element.id,
        // Caps
        canUseApiKeys: true,
        canUseAuthTokens: true,
        canUseConsolePassword: false,
        canUseCustomerSecretKeys: false,
        canUseSmtpCredentials: false,
      }),
    );

    const authToken = this.provide(
      IdentityAuthToken,
      `${idPrefix}-authToken`,
      () => ({
        description: `Continuous Integration Resource Auth Token`,
        userId: user.element.id,
        lifecycle: {
          replaceTriggeredBy: [
            `${secretExpirationElement.terraformResourceType}.${secretExpirationElement.friendlyUniqueId}`,
          ],
        },
      }),
    );

    const privateKey = this.provide(
      PrivateKey,
      `${idPrefix}-privateKey`,
      () => ({
        algorithm: 'RSA',
        rsaBits: 4096,
        lifecycle: {
          replaceTriggeredBy: [
            `${secretExpirationElement.terraformResourceType}.${secretExpirationElement.friendlyUniqueId}`,
          ],
        },
      }),
    );

    const apiKey = this.provide(IdentityApiKey, `${idPrefix}-apiKey`, () => ({
      userId: user.element.id,
      keyValue: privateKey.element.publicKeyPem,
    }));

    this.provide(IdentityPolicy, `${idPrefix}-policy`, id => ({
      compartmentId: this.projectStack.dataOciRootCompartment.element.id,
      description: `Continuous Integration Resource Policy`,
      name: id,
      statements: [
        createOciPolicyStatement({
          subject: {
            type: 'group',
            targets: [group.element.name],
          },
          verb: 'manage',
          resourceType: 'repos',
          location: {
            type: 'compartment',
            expression: this.ocirCompartment.element.name,
          },
        }),
      ],
    }));

    return [{}, { user, authToken, privateKey, apiKey }];
  });

  cdResource = this.provide(Resource, 'cdResource', idPrefix => {
    const secretExpirationElement = this.cicdSecretExpiration.element;
    const group = this.provide(IdentityGroup, `${idPrefix}-group`, id => ({
      compartmentId: this.projectStack.dataOciRootCompartment.element.id,
      description: `Continuous Integration Resource Group`,
      name: id,
    }));

    const user = this.provide(IdentityUser, `${idPrefix}-user`, id => ({
      compartmentId: this.projectStack.dataOciRootCompartment.element.id,
      description: `Continuous Integration Resource User`,
      name: id,
    }));

    this.provide(
      IdentityUserGroupMembership,
      `${idPrefix}-userGroupMembership`,
      () => ({
        groupId: group.element.id,
        userId: user.element.id,
      }),
    );

    const authToken = this.provide(
      IdentityAuthToken,
      `${idPrefix}-authToken`,
      () => ({
        description: `Continuous Integration Resource Auth Token`,
        userId: user.element.id,
        lifecycle: {
          replaceTriggeredBy: [
            `${secretExpirationElement.terraformResourceType}.${secretExpirationElement.friendlyUniqueId}`,
          ],
        },
      }),
    );

    this.provide(IdentityPolicy, `${idPrefix}-policy`, id => ({
      compartmentId: this.projectStack.dataOciRootCompartment.element.id,
      description: `Continuous Integration Resource Policy`,
      name: id,
      statements: [
        createOciPolicyStatement({
          subject: {
            type: 'group',
            targets: [group.element.name],
          },
          verb: 'read',
          resourceType: 'repos',
          location: {
            type: 'compartment',
            expression: this.ocirCompartment.element.name,
          },
        }),
      ],
    }));

    return [{}, { user, authToken }];
  });

  // Container Repositories
  numberPlanetContainerRepository = this.provide(
    ArtifactsContainerRepository,
    'numberPlanetContainerRepository',
    () => {
      const name = 'number-planet';
      return [
        {
          compartmentId: this.ocirCompartment.element.id,
          displayName: name,
          isPublic: false,
        },
        {
          accessUrl: `${this.projectStack.dataOciHomeRegion.element.regionSubscriptions.get(0).regionName}.ocir.io/${this.projectStack.dataOciObjectstorageNamespace.element.namespace}/${name}`,
        },
      ];
    },
  );
  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly projectStack: Project_Stack,
  ) {
    super(terraformAppService.cdktfApp, Ocir_Stack.name, 'Ocir Stack');
  }
}
