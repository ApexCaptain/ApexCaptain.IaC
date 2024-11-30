import { Injectable } from '@nestjs/common';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { OciProvider } from '@lib/terraform/providers/oci/provider';
import { Fn, LocalBackend, TerraformIterator } from 'cdktf';
import path from 'path';
import { File } from '@lib/terraform/providers/local/file';
import { BastionBastion } from '@lib/terraform/providers/oci/bastion-bastion';
import { Oci_Compartment_Stack } from './compartment.stack';
import { Oci_Network_Stack } from './network.stack';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TlsProvider } from '@lib/terraform/providers/tls/provider';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import { PrivateKey } from '@lib/terraform/providers/tls/private-key';
import { BastionSession } from '@lib/terraform/providers/oci/bastion-session';
import { Oci_Oke_Stack } from './oke.stack';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import _ from 'lodash';

@Injectable()
export class Oci_Bastion_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.oci.bastion;

  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      local: this.provide(LocalProvider, 'localProvider', () => ({})),
      tls: this.provide(TlsProvider, 'tlsProvider', () => ({})),
      oci: this.provide(OciProvider, 'ociProvider', () =>
        this.terraformConfigService.providers.oci.ApexCaptain(),
      ),
    },
  };

  okeBastionSshKey = this.provide(Resource, 'okeBastionSshKey', idPrefix => {
    const key = this.provide(PrivateKey, `${idPrefix}-key`, () => ({
      algorithm: 'RSA',
      rsaBits: 4096,
    }));

    const privateSshKeyFileInSecrets = this.provide(
      File,
      `${idPrefix}-privateSshKeyFileInSecrets`,
      id => ({
        filename: path.join(
          process.cwd(),
          this.globalConfigService.config.terraform.stacks.common
            .generatedKeyFilesDirRelativePaths.secrets,
          Oci_Bastion_Stack.name,
          `${id}.key`,
        ),
        content: key.element.privateKeyOpenssh,
      }),
    );

    const privateSshKeyFileInKeys = this.provide(
      File,
      `${idPrefix}-privateSshKeyFileInKeys`,
      id => ({
        filename: path.join(
          process.cwd(),
          this.globalConfigService.config.terraform.stacks.common
            .generatedKeyFilesDirRelativePaths.keys,
          Oci_Bastion_Stack.name,
          `${id}.key`,
        ),
        content: key.element.privateKeyOpenssh,
        filePermission: '0600',
      }),
    );

    return [{}, { key, privateSshKeyFileInSecrets, privateSshKeyFileInKeys }];
  });

  okeBastion = this.provide(BastionBastion, 'okeBastion', id => ({
    bastionType: 'STANDARD',
    compartmentId: this.ociCompartmentStack.kubernetesCompartment.element.id,
    displayName: id,
    name: id,
    targetSubnetId: this.ociNetworkStack.okeBastionPrivateSubnet.element.id,
    clientCidrBlockAllowList: this.config.clientCidrBlockAllowList,
    dnsProxyStatus: 'ENABLED',
  }));

  okeBastionSession = this.provide(BastionSession, 'okeBastionSession', id => ({
    bastionId: this.okeBastion.element.id,
    keyDetails: {
      publicKeyContent:
        this.okeBastionSshKey.shared.key.element.publicKeyOpenssh,
    },
    targetResourceDetails: {
      sessionType: 'DYNAMIC_PORT_FORWARDING',
    },
    displayName: id,
    keyType: 'PUB',
    sessionTtlInSeconds: this.okeBastion.element.maxSessionTtlInSeconds,
  }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly ociCompartmentStack: Oci_Compartment_Stack,
    private readonly ociNetworkStack: Oci_Network_Stack,
    private readonly ociOkeStack: Oci_Oke_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      Oci_Bastion_Stack.name,
      'OCI bastion stack',
    );
  }
}
