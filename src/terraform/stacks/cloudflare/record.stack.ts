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
import { PageRule } from '@lib/terraform/providers/cloudflare/page-rule';

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

  keycloakRecord = this.provide(DnsRecord, 'keycloakRecord', () => ({
    name: 'keycloak',
    ttl: 1,
    type: 'A',
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    content:
      this.k8sOkeNetworkStack
        .ingressControllerFlexibleLoadbalancerReservedPublicIp.element
        .ipAddress,
    proxied: true,
    comment: 'Cloudflare record for Keycloak service',
  }));

  keycloakAdminRecord = this.provide(DnsRecord, 'keycloakAdminRecord', () => ({
    name: 'keycloak-admin',
    ttl: 1,
    type: 'A',
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    content:
      this.k8sOkeNetworkStack
        .ingressControllerFlexibleLoadbalancerReservedPublicIp.element
        .ipAddress,
    proxied: true,
    comment: 'Cloudflare record for Keycloak Admin service',
  }));

  docentRecord = this.provide(DnsRecord, 'docentRecord', () => ({
    name: 'docent',
    ttl: 1,
    type: 'A',
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    content:
      this.k8sOkeNetworkStack
        .ingressControllerFlexibleLoadbalancerReservedPublicIp.element
        .ipAddress,
    proxied: true,
    comment: 'Cloudflare record for Docent service',
  }));

  docentEngineRecord = this.provide(DnsRecord, 'docentEngineRecord', () => ({
    name: 'docent-engine',
    ttl: 1,
    type: 'A',
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    content:
      this.k8sOkeNetworkStack
        .ingressControllerFlexibleLoadbalancerReservedPublicIp.element
        .ipAddress,
    proxied: true,
    comment: 'Cloudflare record for Docent Engine service',
  }));

  okeSftpRecord = this.provide(DnsRecord, 'okeSftpRecord', () => ({
    name: 'sftp-oke',
    ttl: 1,
    type: 'A',
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    content:
      this.k8sOkeNetworkStack
        .ingressControllerFlexibleLoadbalancerReservedPublicIp.element
        .ipAddress,
    proxied: false,
    comment: 'Cloudflare record for OKE SFTP service',
  }));

  workstationSftpRecord = this.provide(
    DnsRecord,
    'workstationSftpRecord',
    () => ({
      name: 'sftp-workstation',
      ttl: 1,
      type: 'CNAME',
      zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
      content:
        this.globalConfigService.config.terraform.stacks.k8s.workstation.common
          .domain.iptime,
      proxied: false,
      comment: 'Cloudflare record for Workstation SFTP service',
    }),
  );

  // For Https Ingress Services

  // argoCdRecord = this.provide(DnsRecord, 'argoCdRecord', () => ({
  //   name: 'argocd',
  //   ttl: 1,
  //   type: 'A',
  //   zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
  //   content:
  //     this.k8sOkeNetworkStack
  //       .ingressControllerFlexibleLoadbalancerReservedPublicIp.element
  //       .ipAddress,
  //   proxied: true,
  //   comment: 'Cloudflare record for Argo CD service',
  // }));

  vaultRecord = this.provide(DnsRecord, 'vaultRecord', () => ({
    name: 'vault',
    ttl: 1,
    type: 'A',
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    content:
      this.k8sOkeNetworkStack
        .ingressControllerFlexibleLoadbalancerReservedPublicIp.element
        .ipAddress,
    proxied: true,
    comment: 'Cloudflare record for Vault service',
  }));

  dbRecord = this.provide(DnsRecord, 'dbRecord', () => ({
    name: 'db',
    ttl: 1,
    type: 'A',
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    content:
      this.k8sOkeNetworkStack
        .ingressControllerFlexibleLoadbalancerReservedPublicIp.element
        .ipAddress,
    proxied: true,
    comment: 'Cloudflare record for Database Client service',
  }));

  redisRecord = this.provide(DnsRecord, 'redisRecord', () => ({
    name: 'redis',
    ttl: 1,
    type: 'A',
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    content:
      this.k8sOkeNetworkStack
        .ingressControllerFlexibleLoadbalancerReservedPublicIp.element
        .ipAddress,
    proxied: true,
    comment: 'Cloudflare record for Redis Client service',
  }));

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
      comment: 'Cloudflare record for Workstation Dashboard service',
    }),
  );

  okeDashboardRecord = this.provide(DnsRecord, 'okeDashboardRecord', () => ({
    name: 'dashboard-oke',
    ttl: 1,
    type: 'A',
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    content:
      this.k8sOkeNetworkStack
        .ingressControllerFlexibleLoadbalancerReservedPublicIp.element
        .ipAddress,
    proxied: true,
    comment: 'Cloudflare record for OKE Dashboard service',
  }));

  oauth2ProxyAdminRecord = this.provide(
    DnsRecord,
    'oauth2ProxyAdminRecord',
    () => ({
      name: 'oauth2-proxy-admin',
      ttl: 1,
      type: 'A',
      zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
      content:
        this.k8sOkeNetworkStack
          .ingressControllerFlexibleLoadbalancerReservedPublicIp.element
          .ipAddress,
      proxied: true,
      comment: 'Cloudflare record for OAuth2 Proxy Admin service',
    }),
  );

  oauth2ProxyContributorRecord = this.provide(
    DnsRecord,
    'oauth2ProxyContributorRecord',
    () => ({
      name: 'oauth2-proxy-contributor',
      ttl: 1,
      type: 'A',
      zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
      content:
        this.k8sOkeNetworkStack
          .ingressControllerFlexibleLoadbalancerReservedPublicIp.element
          .ipAddress,
      proxied: true,
      comment: 'Cloudflare record for OAuth2 Proxy Contributor service',
    }),
  );

  filesRecord = this.provide(DnsRecord, 'filesRecord', () => ({
    name: 'files',
    ttl: 1,
    type: 'A',
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    content:
      this.k8sOkeNetworkStack
        .ingressControllerFlexibleLoadbalancerReservedPublicIp.element
        .ipAddress,
    proxied: true,
    comment: 'Cloudflare record for OKE Files Browser service',
  }));

  longhornRecord = this.provide(DnsRecord, 'longhornRecord', () => ({
    name: 'longhorn',
    ttl: 1,
    type: 'CNAME',
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    content:
      this.globalConfigService.config.terraform.stacks.k8s.workstation.common
        .domain.iptime,
    proxied: true,
    comment: 'Cloudflare record for Longhorn service',
  }));

  jellyfinRecord = this.provide(DnsRecord, 'jellyfinRecord', () => ({
    name: 'jellyfin',
    ttl: 1,
    type: 'CNAME',
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    content:
      this.globalConfigService.config.terraform.stacks.k8s.workstation.common
        .domain.iptime,
    proxied: true,
    comment: 'Cloudflare record for Jellyfin service',
  }));

  torrentRecord = this.provide(DnsRecord, 'qbittorrentRecord', () => ({
    name: 'torrent',
    ttl: 1,
    type: 'CNAME',
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    content:
      this.globalConfigService.config.terraform.stacks.k8s.workstation.common
        .domain.iptime,
    proxied: true,
    comment: 'Cloudflare record for Qbittorrent service',
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
