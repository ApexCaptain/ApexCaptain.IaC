import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { Cloudflare_Record_Stack } from './record.stack';
import { Cloudflare_Zone_Stack } from './zone.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { DnsRecord } from '@lib/terraform/providers/cloudflare/dns-record';
import { CloudflareProvider } from '@lib/terraform/providers/cloudflare/provider';

@Injectable()
export class Cloudflare_Record_Workstation_Stack extends AbstractStack {
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

  windowsRecord = this.provide(DnsRecord, 'windowsRecord', () => ({
    name: `windows.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
    ttl: 1,
    type: 'CNAME',
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    content:
      this.globalConfigService.config.terraform.stacks.k8s.workstation.common
        .domain.iptime,
    proxied: true,
    comment: 'Cloudflare record for Windows service',
  }));

  torrentRecord = this.provide(DnsRecord, 'qbittorrentRecord', () => ({
    name: `torrent.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
    ttl: 1,
    type: 'CNAME',
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    content:
      this.globalConfigService.config.terraform.stacks.k8s.workstation.common
        .domain.iptime,
    proxied: true,
    comment: 'Cloudflare record for Qbittorrent service',
  }));

  jellyfinRecord = this.provide(DnsRecord, 'jellyfinRecord', () => ({
    name: `jellyfin.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
    ttl: 1,
    type: 'CNAME',
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    content:
      this.globalConfigService.config.terraform.stacks.k8s.workstation.common
        .domain.iptime,
    proxied: true,
    comment: 'Cloudflare record for Jellyfin service',
  }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      Cloudflare_Record_Workstation_Stack.name,
      'Cloudflare record workstation stack',
    );
    // Tmp
    this.addDependency(this.cloudflareRecordStack);
  }
}
