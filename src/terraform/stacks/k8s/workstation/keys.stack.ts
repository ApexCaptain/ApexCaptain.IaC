import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { PrivateKey } from '@lib/terraform/providers/tls/private-key';
import { TlsProvider } from '@lib/terraform/providers/tls/provider';
@Injectable()
export class K8S_Workstation_Keys_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBakcned.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      tls: this.provide(TlsProvider, 'tlsProvider', () => ({})),
    },
  };

  sftpServiceKey = this.provide(PrivateKey, 'sftpServiceKey', () => ({
    algorithm: 'RSA',
    rsaBits: 4096,
  })).addOutput(
    id => `${id}_privateKeyOpenSsh`,
    element => ({
      sensitive: true,
      value: element.privateKeyOpenssh,
    }),
  );

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Keys_Stack.name,
      'Keys stack for Workstation k8s',
    );
  }
}
