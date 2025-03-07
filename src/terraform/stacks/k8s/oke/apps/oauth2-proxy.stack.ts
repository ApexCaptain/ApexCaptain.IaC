import { Injectable } from '@nestjs/common';
import { AbstractStack, convertJsonToHelmSet } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { LocalBackend } from 'cdktf';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { K8S_Oke_Apps_IngressController_Stack } from './ingress-controller.stack';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { Cloudflare_Zone_Stack } from '@/terraform/stacks/cloudflare/zone.stack';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare/record.stack';

@Injectable()
export class K8S_Oke_Apps_OAuth2Proxy_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      kubernetes: this.provide(
        KubernetesProvider,
        'kubernetesProvider',
        () => ({
          proxyUrl:
            this.k8sOkeEndpointStack.okeEndpointSource.shared.proxyUrl.socks5,
          configPath:
            this.k8sOkeEndpointStack.okeEndpointSource.shared
              .kubeConfigFilePath,
        }),
      ),
      helm: this.provide(HelmProvider, 'helmProvider', () => ({
        kubernetes: {
          proxyUrl:
            this.k8sOkeEndpointStack.okeEndpointSource.shared.proxyUrl.socks5,
          configPath:
            this.k8sOkeEndpointStack.okeEndpointSource.shared
              .kubeConfigFilePath,
        },
      })),
    },
  };

  meta = {
    name: 'oauth2-proxy',
  };

  // namespace = this.provide(NamespaceV1, 'namespace', () => ({
  //   metadata: {
  //     name: this.meta.name,
  //   },
  // }));

  // oauth2ProxyRelease = this.provide(Release, 'oauth2ProxyRelease', () => {
  //   const host = `${this.cloudflareRecordStack.oauth2ProxyRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`;
  //   const { helmSet, helmSetList } = convertJsonToHelmSet({
  //     config: {
  //       clientID: 'Ov23liZD8vOltXtpmF77',
  //       clientSecret: 'a7984936df55eca24f93e6bed1b782e4684ebfc4',
  //       cookieSecret: 'jebAfU2eZgQt/29H+8x3FQ==',
  //       configFile: `
  //               email_domains = [ "*" ]
  //               upstreams = [ "file:///dev/null" ]
  //               provider = "github"
  //               github_users = "ApexCaptain"
  //             `,
  //     },
  //     extraArgs: {
  //       'cookie-secure': false,
  //       'cookie-domain': '.ayteneve93.com',
  //       'whitelist-domain': '*.ayteneve93.com',
  //     },
  //     ingress: {
  //       enabled: true,
  //       path: '/oauth2',
  //       className: 'nginx',
  //       hosts: [host],
  //     },
  //   });

  //   return [
  //     {
  //       name: this.meta.name,
  //       chart: 'oauth2-proxy',
  //       repository: 'https://oauth2-proxy.github.io/manifests',
  //       namespace: this.namespace.element.metadata.name,
  //       createNamespace: false,
  //       set: helmSet,
  //       setList: helmSetList,
  //     },
  //     { host },
  //   ];
  // });

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeAppsIngressControllerStack: K8S_Oke_Apps_IngressController_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_OAuth2Proxy_Stack.name,
      'OAuth2 Proxy stack for oke k8s',
    );
    this.addDependency(this.k8sOkeAppsIngressControllerStack);
  }
}
