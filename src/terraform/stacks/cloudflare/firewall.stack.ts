import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
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

  countryBasedRuleset = this.provide(Ruleset, 'countryBasedRuleset', id => ({
    zoneId: this.cloudflareZoneStack.dataAyteneve93Zone.element.zoneId,
    name: id,
    description: 'Block countries except Korea and Japan',
    kind: 'zone',
    phase: 'http_request_firewall_custom',
    rules: [
      {
        action: 'block',
        expression: '(ip.geoip.country ne "KR" and ip.geoip.country ne "JP")',
        enabled: true,
      },
    ],
  }));

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      Cloudflare_Firewall_Stack.name,
      'Cloudflare firewall stack',
    );
  }
}
