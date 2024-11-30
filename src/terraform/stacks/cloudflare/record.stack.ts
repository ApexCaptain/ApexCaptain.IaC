import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { Cloudflare_Zone_Stack } from './zone.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { CloudflareProvider } from '@lib/terraform/providers/cloudflare/provider';
import { Record } from '@lib/terraform/providers/cloudflare/record';

@Injectable()
export class Cloudflare_Record_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBakcned.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      cloudflare: this.provide(CloudflareProvider, 'cloudflareProvider', () =>
        this.terraformConfigService.providers.cloudflare.ApexCaptain(),
      ),
    },
  };

  defaultRecord = this.provide(Record, 'defaultRecord', () => ({
    name: 'www',
    type: 'CNAME',
    content:
      this.globalConfigService.config.terraform.stacks.k8s.workstation.common
        .domain.iptime,
    proxied: true,
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    comment: 'Cloudflare DNS record for default service',
  }));

  cloudbeaverRecord = this.provide(Record, 'cloudbeaverRecord', () => ({
    name: 'cloudbeaver',
    type: 'CNAME',
    content:
      this.globalConfigService.config.terraform.stacks.k8s.workstation.common
        .domain.iptime,
    proxied: true,
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    comment: 'Cloudflare DNS record for CloudBeaver service',
  }));

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Stacks
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      Cloudflare_Record_Stack.name,
      'Cloudflare record stack',
    );
  }
}
