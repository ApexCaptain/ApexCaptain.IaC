import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import dedent from 'dedent';
import { K8S_Oke_Network_Stack } from '../k8s';
import { Cloudflare_Record_Oke_Stack } from './record.oke.stack';
import { Cloudflare_Record_Stack } from './record.stack';
import { Cloudflare_Record_Workstation_Stack } from './record.workstation.stack';
import { Cloudflare_Zone_Stack } from './zone.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { CloudflareProvider } from '@lib/terraform/providers/cloudflare/provider';
import { Ruleset } from '@lib/terraform/providers/cloudflare/ruleset';

@Injectable()
export class Cloudflare_Ruleset_Stack extends AbstractStack {
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

  firewallRules = this.provide(Ruleset, 'firewallRules', id => {
    const ipv4Home =
      this.globalConfigService.config.terraform.externalIpCidrBlocks.apexCaptainHomeIpv4.split(
        '/',
      )[0];
    const ipv4NayuntechCorp =
      this.globalConfigService.config.terraform.externalIpCidrBlocks.nayuntechCorpIpv4.split(
        '/',
      )[0];

    const ociNgwPublicIp = this.k8sOkeNetworkStack.okeNatGateway.element.natIp;

    const domainsCoveredByAuthentik = [
      // OKE
      this.cloudflareRecordOkeStack.dbRecord,
      // Workstation
      this.cloudflareRecordWorkstationStack.windowsRecord,
      this.cloudflareRecordWorkstationStack.torrentRecord,
    ];

    return {
      zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
      name: id,
      description: dedent`
        Allow ArgoCD webhooks and all traffic to Blog.
        Allow access authentik to covered domains.
        Block Authentik access from unknown IPs.
        Otherwise, block countries except Korea and Japan as default.
      `,
      kind: 'zone',
      phase: 'http_request_firewall_custom',
      rules: [
        {
          description: 'Allow all traffic to blog',
          enabled: true,
          action: 'skip',
          logging: {
            enabled: true,
          },
          expression: dedent`
            http.host eq "${this.cloudflareRecordStack.blogRecord.element.name}"
          `,
          actionParameters: {
            ruleset: 'current',
          },
        },
        {
          description: 'Allow ArgoCD webhooks',
          enabled: true,
          action: 'skip',
          logging: {
            enabled: true,
          },
          expression: dedent`
            http.host eq "${this.cloudflareRecordStack.argoCdRecord.element.name}"
            and http.request.uri.path contains "/api/webhook"
          `,
          actionParameters: {
            ruleset: 'current',
          },
        },
        {
          description: 'Allow Authentik access to covered domains',
          enabled: true,
          action: 'skip',
          logging: {
            enabled: true,
          },
          expression: dedent`
            http.host eq "${this.cloudflareRecordOkeStack.authentikRecord.element.name}"
            and (
              starts_with(http.request.uri.path, "/static")
              or starts_with(http.request.uri.path, "/ws")
              or (
                http.request.uri.query contains "redirect_uri"
                and ( ${domainsCoveredByAuthentik.map(domain => `http.request.uri.query contains "${domain.element.name}"`).join(' or ')} )
              )
            )
          `,
          actionParameters: {
            ruleset: 'current',
          },
        },
        {
          description: 'Block Authentik access from unknown IPs',
          enabled: true,
          action: 'block',
          expression: dedent`
            http.host eq "${this.cloudflareRecordOkeStack.authentikRecord.element.name}"
            ${[ipv4Home, ipv4NayuntechCorp, ociNgwPublicIp]
              .map(ip => `and ip.src ne ${ip}`)
              .join('\n')}
          `,
        },
        {
          description: 'Block countries except Korea and Japan as default',
          enabled: true,
          action: 'block',
          expression: dedent`
            ip.geoip.country ne "KR"
            and ip.geoip.country ne "JP"
          `,
        },
      ],
    };
  });

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Stacks
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
    private readonly cloudflareRecordOkeStack: Cloudflare_Record_Oke_Stack,
    private readonly cloudflareRecordWorkstationStack: Cloudflare_Record_Workstation_Stack,
    private readonly k8sOkeNetworkStack: K8S_Oke_Network_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      Cloudflare_Ruleset_Stack.name,
      'Cloudflare ruleset stack',
    );
  }
}
