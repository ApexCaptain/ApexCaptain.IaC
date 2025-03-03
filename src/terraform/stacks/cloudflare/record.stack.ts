import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { Cloudflare_Zone_Stack } from './zone.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { DnsRecord } from '@lib/terraform/providers/cloudflare/dns-record';
import { CloudflareProvider } from '@lib/terraform/providers/cloudflare/provider';
import { K8S_Oke_Network_Stack } from '../k8s/oke/network.stack';

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

  redisInsightDnsRecord = this.provide(
    DnsRecord,
    'redisInsightDnsRecord',
    () => ({
      name: 'redis-insight',
      ttl: 1,
      type: 'CNAME',
      zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
      content:
        this.globalConfigService.config.terraform.stacks.k8s.workstation.common
          .domain.iptime,
      proxied: true,
      comment: 'Cloudflare DNS record for RedisInsight service',
    }),
  );

  workstationDashboardRecord = this.provide(
    DnsRecord,
    'workstationDashboardRecord',
    () => ({
      name: 'dashboard-workstation',
      ttl: 1,
      type: 'CNAME',
      zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
      content:
        this.globalConfigService.config.terraform.stacks.k8s.workstation.common
          .domain.iptime,
      proxied: true,
      comment: 'Cloudflare DNS record for Workstation Dashboard service',
    }),
  );

  okeDashboardRecord = this.provide(DnsRecord, 'okeDashboardRecore', () => ({
    name: 'dashboard-oke',
    ttl: 1,
    type: 'A',
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    content:
      this.k8sOkeNetworkStack
        .ingressControllerFlexibleLoadbalancerReservedPublicIp.element
        .ipAddress,
    proxied: true,
    comment: 'Cloudflare DNS record for OKE Dashboard service',
  }));

  okeConsulRecord = this.provide(DnsRecord, 'okeConsulRecord', () => ({
    name: 'consul-oke',
    ttl: 1,
    type: 'A',
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    content:
      this.k8sOkeNetworkStack
        .ingressControllerFlexibleLoadbalancerReservedPublicIp.element
        .ipAddress,
    proxied: true,
    comment: 'Cloudflare DNS record for OKE Consul service',
  }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
    private readonly k8sOkeNetworkStack: K8S_Oke_Network_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      Cloudflare_Record_Stack.name,
      'Cloudflare record stack',
    );
  }
}
