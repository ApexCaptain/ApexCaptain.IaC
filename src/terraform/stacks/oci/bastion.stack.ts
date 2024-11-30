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

@Injectable()
export class Oci_Bastion_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.oci.bastion;

  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBakcned.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      local: this.provide(LocalProvider, 'localProvider', () => ({})),
      tls: this.provide(TlsProvider, 'tlsProvider', () => ({})),
      oci: this.provide(OciProvider, 'ociProvider', () =>
        this.terraformConfigService.providers.oci.ApexCaptain(),
      ),
    },
  };

  // okeBastionSshKey = this.provide(PrivateKey, 'okeBastionSshKey', () => ({
  //   algorithm: 'RSA',
  //   rsaBits: 4096,
  // }));

  // okeBastionSshKeyPrivateOpenSshFileInSecrets = this.provide(
  //   File,
  //   'okeBastionSshKeyPrivateOpenSshFileInSecrets',
  //   id => ({
  //     filename: path.join(
  //       process.cwd(),
  //       this.globalConfigService.config.terraform.stacks.common
  //         .generatedKeyFilesDirRelativePaths.secrets,
  //       Oci_Bastion_Stack.name,
  //       `${id}.key`,
  //     ),
  //     content: this.okeBastionSshKey.element.privateKeyOpenssh,
  //   }),
  // );

  // okeBastionSshKeyPrivateOpenSshFileInKeys = this.provide(
  //   File,
  //   'okeBastionSshKeyPrivateOpenSshFileInKeys',
  //   id => ({
  //     filename: path.join(
  //       process.cwd(),
  //       this.globalConfigService.config.terraform.stacks.common
  //         .generatedKeyFilesDirRelativePaths.keys,
  //       Oci_Bastion_Stack.name,
  //       `${id}.key`,
  //     ),
  //     content: this.okeBastionSshKey.element.privateKeyOpenssh,
  //     filePermission: '0600',
  //   }),
  // );

  // okeBastion = this.provide(BastionBastion, 'okeBastion', id => ({
  //   bastionType: 'STANDARD',
  //   compartmentId: this.ociCompartmentStack.kubernetesCompartment.element.id,
  //   displayName: id,
  //   name: id,
  //   targetSubnetId: this.ociNetworkStack.okeBastionPrivateSubnet.element.id,
  //   clientCidrBlockAllowList: this.config.clientCidrBlockAllowList,
  //   dnsProxyStatus: 'ENABLED',
  // }));

  // okeBastionK8sEndpointSession = this.provide(
  //   BastionSession,
  //   'okeBastionK8sEndpointSession',
  //   id => {
  //     const k8sEndpointInfo = Fn.split(
  //       ':',
  //       Fn.lookup(
  //         Fn.element(this.ociOkeStack.okeCluster.element.endpoints, 0),
  //         'private_endpoint',
  //       ),
  //     );
  //     return {
  //       bastionId: this.okeBastion.element.id,
  //       keyDetails: {
  //         publicKeyContent: this.okeBastionSshKey.element.publicKeyOpenssh,
  //       },
  //       targetResourceDetails: {
  //         sessionType: 'PORT_FORWARDING',
  //         targetResourcePrivateIpAddress: Fn.element(k8sEndpointInfo, 0),
  //         targetResourcePort: Fn.element(k8sEndpointInfo, 1),
  //       },
  //       displayName: `${id}_${this.ociOkeStack.okeCluster.element.name}`,
  //       keyType: 'PUB',
  //       sessionTtlInSeconds: this.okeBastion.element.maxSessionTtlInSeconds,
  //     };
  //   },
  // );

  // okeBastionArmNodePoolSessions = this.provide(
  //   BastionSession,
  //   'okeBastionArmNodePoolSessions',
  //   id => {
  //     const nodes = TerraformIterator.fromComplexList(
  //       this.ociOkeStack.okeArmNodePool.element.nodes,
  //       'id',
  //     );

  //     return {
  //       forEach: nodes,
  //       bastionId: this.okeBastion.element.id,
  //       keyDetails: {
  //         publicKeyContent: this.okeBastionSshKey.element.publicKeyOpenssh,
  //       },
  //       targetResourceDetails: {
  //         sessionType: 'MANAGED_SSH',
  //         targetResourceId: nodes.getString('id'),
  //         targetResourceOperatingSystemUserName: 'opc',
  //       },
  //       displayName: `${id}_${nodes.getString('name')}`,
  //       keyType: 'PUB',
  //       sessionTtlInSeconds: this.okeBastion.element.maxSessionTtlInSeconds,
  //     };
  //   },
  // );

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
