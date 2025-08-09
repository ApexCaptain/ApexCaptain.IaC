import { AbstractStack } from '@/common';
import {
  Cloudflare_Zone_Stack,
  Cloudflare_Record_Stack,
} from '@/terraform/stacks/cloudflare';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { K8S_Oke_Apps_OAuth2Proxy_Stack } from '../../oke';
import { K8S_Workstation_Apps_Nas_Stack } from './nas.stack';
import yaml from 'yaml';

@Injectable()
export class K8S_Workstation_Apps_NAS_Jellyfin_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      helm: this.provide(HelmProvider, 'helmProvider', () => ({
        kubernetes: {
          configPath:
            this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation()
              .configPath,
          insecure: true,
        },
      })),
    },
  };

  jellyfinRelease = this.provide(Release, 'jellyfinRelease', () => {
    return {
      name: this.k8sWorkstationAppsNasStack.metadata.shared.helm.jellyfin.name,
      chart:
        this.k8sWorkstationAppsNasStack.metadata.shared.helm.jellyfin.chart,
      repository:
        this.k8sWorkstationAppsNasStack.metadata.shared.helm.jellyfin
          .repository,
      namespace:
        this.k8sWorkstationAppsNasStack.namespace.element.metadata.name,
      createNamespace: false,
      values: [
        yaml.stringify({
          image: {
            pullPolicy: 'Always',
          },
          runtimeClassName: 'nvidia',
          ingress: {
            enabled: true,
            className: 'nginx',
            hosts: [
              {
                host: `${this.cloudflareRecordStack.jellyfinRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
                paths: [
                  {
                    path: '/',
                    pathType: 'ImplementationSpecific',
                  },
                ],
              },
            ],
          },
          persistence: {
            config: {
              existingClaim:
                this.k8sWorkstationAppsNasStack
                  .jellyfinConfigPersistentVolumeClaim.element.metadata.name,
            },
            media: {
              existingClaim:
                this.k8sWorkstationAppsNasStack
                  .jellyfinMediaPersistentVolumeClaim.element.metadata.name,
            },
          },
        }),
      ],
    };
  });

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationAppsNasStack: K8S_Workstation_Apps_Nas_Stack,
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
    private readonly k8sOkeAppsOAuth2ProxyStack: K8S_Oke_Apps_OAuth2Proxy_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_NAS_Jellyfin_Stack.name,
      'Nas Jellyfin stack for workstation k8s',
    );
    this.addDependency(this.k8sOkeAppsOAuth2ProxyStack);
  }
}
