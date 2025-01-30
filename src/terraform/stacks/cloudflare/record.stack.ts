import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { Cloudflare_Zone_Stack } from './zone.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { CloudflareProvider } from '@lib/terraform/providers/cloudflare/provider';
import { DnsRecord } from '@lib/terraform/providers/cloudflare/dns-record';

@Injectable()
export class Cloudflare_Record_Stack extends AbstractStack {
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

  cloudbeaverDnsRecord = this.provide(
    DnsRecord,
    'cloudbeaverDnsRecord',
    () => ({
      name: 'cloudbeaver',
      ttl: 1,
      type: 'CNAME',
      zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
      content:
        this.globalConfigService.config.terraform.stacks.k8s.workstation.common
          .domain.iptime,
      proxied: true,
      comment: 'Cloudflare DNS record for CloudBeaver service',
    }),
  );
  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

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
