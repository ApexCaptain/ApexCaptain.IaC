import path from 'path';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Oke_Compartment_Stack } from './compartment.stack';
import { K8S_Oke_Network_Stack } from './network.stack';
import { AbstractStack, createExpirationInterval } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Container as DockerContainer } from '@lib/terraform/providers/docker/container';
import { Image as DockerImage } from '@lib/terraform/providers/docker/image';
import { DockerProvider } from '@lib/terraform/providers/docker/provider';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import { SensitiveFile } from '@lib/terraform/providers/local/sensitive-file';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { BastionBastion } from '@lib/terraform/providers/oci/bastion-bastion';
import { BastionSession } from '@lib/terraform/providers/oci/bastion-session';
import { OciProvider } from '@lib/terraform/providers/oci/provider';
import { Integer as RandomInteger } from '@lib/terraform/providers/random/integer';
import { RandomProvider } from '@lib/terraform/providers/random/provider';
import { PrivateKey } from '@lib/terraform/providers/tls/private-key';
import { TlsProvider } from '@lib/terraform/providers/tls/provider';
import { TimeProvider } from '@lib/terraform/providers/time/provider';
import { StaticResource } from '@lib/terraform/providers/time/static-resource';
import { Project_Stack } from '../../project.stack';

@Injectable()
export class K8S_Oke_Bastion_Stack extends AbstractStack {
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
      docker: this.provide(DockerProvider, 'dockerProvider', () => ({})),
      random: this.provide(RandomProvider, 'randomProvider', () => ({})),
      time: this.provide(TimeProvider, 'timeProvider', () => ({})),
    },
  };

  privateKeyExpiration = this.provide(
    StaticResource,
    `privateKeyExpiration`,
    () => ({
      triggers: {
        expirationDate: createExpirationInterval({
          hours: 2,
        }).toString(),
      },
    }),
  );

  privateKey = this.provide(Resource, 'privateKey', idPrefix => {
    const expirationElement = this.privateKeyExpiration.element;
    const key = this.provide(PrivateKey, `${idPrefix}-key`, () => ({
      algorithm: 'RSA',
      rsaBits: 4096,
      lifecycle: {
        replaceTriggeredBy: [
          `${expirationElement.terraformResourceType}.${expirationElement.friendlyUniqueId}`,
        ],
      },
    }));

    const privateSshKeyFileInKeys = this.provide(
      SensitiveFile,
      `${idPrefix}-privateSshKeyFileInKeys`,
      id => ({
        filename: path.join(
          process.cwd(),
          this.globalConfigService.config.terraform.stacks.common
            .generatedKeyFilesDirPaths.relativeKeysDirPath,
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
    clientCidrBlockAllowList: [
      this.globalConfigService.config.terraform.externalIpCidrBlocks
        .apexCaptainHomeIpv4,
    ],
    dnsProxyStatus: 'ENABLED',
  }));

  okeBastionSession = this.provide(BastionSession, 'okeBastionSession', id => {
    return {
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
    };
  });

  okeBastionSessionTunnelPort = this.provide(
    RandomInteger,
    'okeBastionSessionTunnelPort',
    () => ({
      min: 10000,
      max: 65535,
      keepers: {
        expirationDate: createExpirationInterval({
          days: 10,
        }).toString(),
      },
    }),
  );

  okeBastionSessionContainerImage = this.provide(
    DockerImage,
    'okeBastionSessionContainerImage',
    () => ({
      name: 'rastasheep/ubuntu-sshd',
    }),
  );

  okeBastionSessionContainer = this.provide(
    DockerContainer,
    'okeBastionSessionContainer',
    id => ({
      image: this.okeBastionSessionContainerImage.element.imageId,
      name: id,
      rm: false,
      volumes: [
        {
          containerPath: '/root/.ssh/id_rsa',
          hostPath:
            this.privateKey.shared.privateSshKeyFileInKeys.element.filename,
          readOnly: true,
        },
      ],
      restart: 'unless-stopped',
      networkMode: 'bridge',
      command: [
        'sh',
        '-c',
        [
          'ssh',
          '-o StrictHostKeyChecking=no',
          '-N -D',
          `0.0.0.0:${this.okeBastionSessionTunnelPort.element.result}`,
          `${this.okeBastionSession.element.id}@host.bastion.${this.projectStack.dataOciHomeRegion.element.regionSubscriptions.get(0).regionName}.oci.oraclecloud.com`,
        ].join(' '),
      ],
    }),
  );

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly projectStack: Project_Stack,
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
