import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { DataCloudflareZone } from '@lib/terraform/providers/cloudflare/data-cloudflare-zone';
import { CloudflareProvider } from '@lib/terraform/providers/cloudflare/provider';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';

@Injectable()
export class Cloudflare_Zone_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.cloudflare.zone;

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
      zoneId: this.config.ayteneve93com.zoneId,
    }),
  );

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

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
