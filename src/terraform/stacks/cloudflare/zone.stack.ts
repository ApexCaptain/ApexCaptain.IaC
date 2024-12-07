import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { DataCloudflareZone } from '@lib/terraform/providers/cloudflare/data-cloudflare-zone';
import { CloudflareProvider } from '@lib/terraform/providers/cloudflare/provider';

@Injectable()
export class Cloudflare_Zone_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      cloudflare: this.provide(CloudflareProvider, 'cloudflareProvider', () =>
        this.terraformConfigService.providers.cloudflare.ApexCaptain(),
      ),
    },
  };

  dataAyteneve93Zone = this.provide(
    DataCloudflareZone,
    'dataAyteneve93Zone',
    () => ({
      name: 'ayteneve93.com',
    }),
  );

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
  ) {
    super(
      terraformAppService.cdktfApp,
      Cloudflare_Zone_Stack.name,
      'Cloudflare zone stack',
    );
  }
}
