import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import { K8S_Oke_Apps_Authentik_Resources_Stack } from './authentik.resources.stack';
import { K8S_Oke_Apps_Authentik_Stack } from './authentik.stack';
import { K8S_Oke_Apps_Cloudbeaver_Stack } from './cloudbeaver.stack';
import { K8S_Oke_Apps_Istio_Stack } from './istio.stack';
import { AbstractStack } from '@/common';
import { Cloudflare_Record_Oke_Stack } from '@/terraform/stacks/cloudflare';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Outpost } from '@lib/terraform/providers/authentik/outpost';
import { AuthentikProvider } from '@lib/terraform/providers/authentik/provider';

@Injectable()
export class K8S_Oke_Apps_Authentik_Outpost_Stack extends AbstractStack {
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
    const providers = [this.k8sOkeAppsCloudbeaverStack.authentikProxyProvider];
    return {
      name: this.k8sOkeAppsIstioStack.istiodRelease.shared
        .okeAuthentikProxyOutpostName,
      type: 'proxy',
      protocolProviders: providers.map(provider =>
        Fn.tonumber(provider.element.id),
      ),
      serviceConnection:
        this.k8sOkeAppsAuthentikResourcesStack
          .dataLocalK8sClusterServiceConnection.element.id,
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
    private readonly k8sOkeAppsIstioStack: K8S_Oke_Apps_Istio_Stack,
    private readonly cloudflareRecordOkeStack: Cloudflare_Record_Oke_Stack,
    private readonly k8sOkeAppsCloudbeaverStack: K8S_Oke_Apps_Cloudbeaver_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Authentik_Outpost_Stack.name,
      'Authentik Outpost stack for OKE k8s',
    );
  }
}
