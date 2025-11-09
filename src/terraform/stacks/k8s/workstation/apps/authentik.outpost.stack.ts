import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import { K8S_Workstation_Apps_Istio_Stack } from './istio.stack';
import { K8S_Workstation_Apps_Nas_Qbittorrent_Stack } from './nas.qbittorrent.stack';
import { K8S_Workstation_Apps_Windows_Stack } from './windows.stack';
import { K8S_Oke_Apps_Authentik_Resources_Stack } from '../../oke/apps/authentik.resources.stack';
import { K8S_Oke_Apps_Authentik_Stack } from '../../oke/apps/authentik.stack';
import { AbstractStack } from '@/common';
import { Cloudflare_Record_Oke_Stack } from '@/terraform/stacks/cloudflare';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Outpost } from '@lib/terraform/providers/authentik/outpost';
import { AuthentikProvider } from '@lib/terraform/providers/authentik/provider';

@Injectable()
export class K8S_Workstation_Apps_Authentik_Outpost_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      authentik: this.provide(
        AuthentikProvider,
        'authentikProvider',
        () =>
          this.k8sOkeAppsAuthentikStack.authentikProviderConfig.shared.config,
      ),
    },
  };

  proxyOutpost = this.provide(Outpost, 'proxyOutpost', () => {
    const providers = [
      this.k8sWorkstationWindowsStack.authentikProxyProvider,
      this.k8sWorkstationNasQbittorrentStack.qbittorrentAuthentikProxyProvider,
    ];
    return {
      name: this.k8sWorkstationAppsIstioStack.istiodRelease.shared
        .authentikProxyOutpostName,
      type: 'proxy',
      protocolProviders: providers.map(provider =>
        Fn.tonumber(provider.element.id),
      ),
      serviceConnection:
        this.k8sOkeAppsAuthentikResourcesStack.workstationKubernetesCluster
          .element.id,
      config: JSON.stringify({
        authentik_host: `https://${this.cloudflareRecordOkeStack.authentikRecord.element.name}`,
      }),
    };
  });

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeAppsAuthentikStack: K8S_Oke_Apps_Authentik_Stack,
    private readonly k8sOkeAppsAuthentikResourcesStack: K8S_Oke_Apps_Authentik_Resources_Stack,
    private readonly k8sWorkstationAppsIstioStack: K8S_Workstation_Apps_Istio_Stack,
    private readonly cloudflareRecordOkeStack: Cloudflare_Record_Oke_Stack,

    private readonly k8sWorkstationWindowsStack: K8S_Workstation_Apps_Windows_Stack,
    private readonly k8sWorkstationNasQbittorrentStack: K8S_Workstation_Apps_Nas_Qbittorrent_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Authentik_Outpost_Stack.name,
      'Authentik Outpost stack for Workstation k8s',
    );
  }
}
