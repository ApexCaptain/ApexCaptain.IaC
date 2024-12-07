import { Injectable } from '@nestjs/common';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import path from 'path';
import { File } from '@lib/terraform/providers/local/file';
import { BastionBastion } from '@lib/terraform/providers/oci/bastion-bastion';
import { OciProvider } from '@lib/terraform/providers/oci/provider';
import { TlsProvider } from '@lib/terraform/providers/tls/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { PrivateKey } from '@lib/terraform/providers/tls/private-key';
import { BastionSession } from '@lib/terraform/providers/oci/bastion-session';
import { LocalBackend } from 'cdktf';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { K8S_Oke_Compartment_Stack } from './compartment.stack';
import { K8S_Oke_Network_Stack } from './network.stack';

@Injectable()
export class K8S_Oke_Bastion_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.k8s.oke.bastion;

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

  privateKey = this.provide(Resource, 'privateKey', idPrefix => {
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
          `${K8S_Oke_Bastion_Stack.name}-${id}.key`,
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
          `${K8S_Oke_Bastion_Stack.name}-${id}.key`,
        ),
        content: key.element.privateKeyOpenssh,
        filePermission: '0600',
      }),
    );

    return [
      {},
      {
        key,
        privateSshKeyFileInSecrets,
        privateSshKeyFileInKeys,
      },
    ];
  });

  okeBastion = this.provide(BastionBastion, 'okeBastion', id => ({
    bastionType: 'STANDARD',
    compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
    displayName: id,
    name: id,
    targetSubnetId: this.k8sOkeNetworkStack.okeBastionPrivateSubnet.element.id,
    clientCidrBlockAllowList: this.config.clientCidrBlockAllowList,
    dnsProxyStatus: 'ENABLED',
  }));

  okeBastionSession = this.provide(BastionSession, 'okeBastionSession', id => ({
    bastionId: this.okeBastion.element.id,
    keyDetails: {
      publicKeyContent: this.privateKey.shared.key.element.publicKeyOpenssh,
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
    private readonly k8sOkeCompartmentStack: K8S_Oke_Compartment_Stack,
    private readonly k8sOkeNetworkStack: K8S_Oke_Network_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Bastion_Stack.name,
      'K8S OKE Bastion Stack',
    );
  }
}
