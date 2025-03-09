import { Injectable } from '@nestjs/common';
import {
  AbstractStack,
  convertJsonToHelmSet,
  createExpirationInterval,
} from '@/common';
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
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { RandomProvider } from '@lib/terraform/providers/random/provider';
import { StringResource } from '@lib/terraform/providers/random/string-resource';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import _ from 'lodash';

@Injectable()
export class K8S_Oke_Apps_OAuth2Proxy_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.k8s.oke.apps.oauth2Proxy;

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
      random: this.provide(RandomProvider, 'randomProvider', () => ({})),
    },
  };

  meta = {
    name: 'oauth2-proxy',
    labels: {
      app: 'oauth2-proxy',
    },
  };

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.meta.name,
    },
  }));

  cookieSecret = this.provide(StringResource, 'cookieSecret', () => ({
    length: 32,
    keepers: {
      expirationDate: createExpirationInterval({
        days: 30,
      }).toString(),
    },
  }));

  releaseSecret = this.provide(SecretV1, 'releaseSecret', id => ({
    metadata: {
      name: _.kebabCase(`${this.meta.name}-${id}`),
      labels: this.meta.labels,
      namespace: this.namespace.element.metadata.name,
    },
    data: {
      'client-id': this.config.clientId,
      'client-secret': this.config.clientSecret,
      'cookie-secret': this.cookieSecret.element.result,
    },
    type: 'Opaque',
  }));

  release = this.provide(Release, 'release', () => {
    const rootDomain = this.cloudflareZoneStack.dataAyteneve93Zone.element.name;
    const host = `${this.cloudflareRecordStack.oauth2ProxyRecord.element.name}.${rootDomain}`;
    const { helmSet, helmSetList } = convertJsonToHelmSet({
      config: {
        existingSecret: this.releaseSecret.element.metadata.name,
        configFile: `
                  redirect_url="/oauth2/callback"
                  login_url="https://github.com/login/oauth/authorize"
                  redeem_url="https://github.com/login/oauth/access_token"
                  whitelist_domains="*.${rootDomain}"
                  cookie_domains=".${rootDomain}"
                  scope="read:org user:email"
                  provider="github"
                  skip_provider_button="true"
                  session_store_type="cookie"
                  cookie_samesite="lax"
                  cookie_secure="true"
                  cookie_expire="12h"
                  reverse_proxy="true"
                  pass_access_token="true"
                  pass_authorization_header="true"
                  cookie_csrf_per_request="true"
                  cookie_csrf_expire="5m"
                  cookie_refresh="5m"
                  set_xauthrequest="true"
                  set_authorization_header="false"
                  skip_auth_preflight="true"
                  github_users="${this.config.allowedGithubUsers.join(',')}"
                  email_domains="*"
              `,
      },

      ingress: {
        enabled: true,
        pathType: 'ImplementationSpecific',
        className: 'nginx',
        hosts: [host],
      },
    });

    return [
      {
        name: this.meta.name,
        chart: 'oauth2-proxy',
        repository: 'https://oauth2-proxy.github.io/manifests',
        namespace: this.namespace.element.metadata.name,
        createNamespace: false,
        set: helmSet,
        setList: helmSetList,
      },
      {
        authUrl: `https://${host}/oauth2/auth`,
        authSignin: `https://${host}/oauth2/start?rd=$scheme://$host$request_uri`,
      },
    ];
  });

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

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
