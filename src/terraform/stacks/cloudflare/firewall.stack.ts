import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import dedent from 'dedent';
import { Cloudflare_Record_Stack } from './record.stack';
import { Cloudflare_Zone_Stack } from './zone.stack';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { CloudflareProvider } from '@lib/terraform/providers/cloudflare/provider';
import { Ruleset } from '@lib/terraform/providers/cloudflare/ruleset';

@Injectable()
export class Cloudflare_Firewall_Stack extends AbstractStack {
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

  firewallRules = this.provide(Ruleset, 'firewallRules', id => ({
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    name: id,
    description: dedent`
      Allow ArgoCD webhooks and all traffic to Blog.
      Otherwise, block countries except Korea and Japan.
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
        expression: `http.host eq "${this.cloudflareRecordStack.blogRecord.element.name}"`,
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
        expression: `http.host eq "${this.cloudflareRecordStack.argoCdRecord.element.name}" and http.request.uri.path contains "/api/webhook"`,
        actionParameters: {
          ruleset: 'current',
        },
      },
      {
        description: 'Block countries except Korea and Japan',
        enabled: true,
        action: 'block',
        expression: '(ip.geoip.country ne "KR" and ip.geoip.country ne "JP")',
      },
    ],
  }));

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      Cloudflare_Firewall_Stack.name,
      'Cloudflare firewall stack',
    );
  }
}
