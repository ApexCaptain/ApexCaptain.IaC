import { Injectable } from '@nestjs/common';
import { AbstractStack, createExpirationInterval } from '@/common';
import yaml from 'yaml';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { LocalBackend } from 'cdktf';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
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
import { Resource } from '@lib/terraform/providers/null/resource';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { K8S_Oke_System_Stack } from '../system.stack';
import { K8S_Oke_Apps_IngressController_Stack } from './ingress-controller.stack';
import dedent from 'dedent';

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
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
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

  private readonly metadata = this.provide(Resource, 'metadata', () => [
    {},
    {
      ...this.k8sOkeSystemStack.applicationMetadata.shared.oauth2Proxy,
      adminGithubUsers: [
        this.globalConfigService.config.terraform.externalGithubUsers
          .ApexCaptain.githubUsername,
      ],
      contributorGithubUsers: [
        this.globalConfigService.config.terraform.externalGithubUsers
          .gjwoo960101.githubUsername,
      ],
    },
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
    },
  }));

  oauth2ProxyAdminReleaseCookieSecret = this.provide(
    StringResource,
    'oauth2ProxyAdminReleaseCookieSecret',
    () => ({
      length: 32,
      keepers: {
        expirationDate: createExpirationInterval({
          days: 30,
        }).toString(),
      },
    }),
  );

  oauth2ProxyContributorReleaseCookieSecret = this.provide(
    StringResource,
    'oauth2ProxyContributorReleaseCookieSecret',
    () => ({
      length: 32,
      keepers: {
        expirationDate: createExpirationInterval({
          days: 30,
        }).toString(),
      },
    }),
  );

  oauth2ProxyAdminReleaseSecret = this.provide(
    SecretV1,
    'oauth2ProxyAdminReleaseSecret',
    id => ({
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      data: {
        'client-id': this.config.admin.clientId,
        'client-secret': this.config.admin.clientSecret,
        'cookie-secret':
          this.oauth2ProxyAdminReleaseCookieSecret.element.result,
      },
      type: 'Opaque',
    }),
  );

  oauth2ProxyContributorReleaseSecret = this.provide(
    SecretV1,
    'oauth2ProxyContributorReleaseSecret',
    id => ({
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      data: {
        'client-id': this.config.contributor.clientId,
        'client-secret': this.config.contributor.clientSecret,
        'cookie-secret':
          this.oauth2ProxyContributorReleaseCookieSecret.element.result,
      },
      type: 'Opaque',
    }),
  );

  oauth2ProxyAdminRelease = this.provide(
    Release,
    'oauth2ProxyAdminRelease',
    () => {
      const rootDomain =
        this.cloudflareZoneStack.dataAyteneve93Zone.element.name;
      const host = `${this.cloudflareRecordStack.oauth2ProxyAdminRecord.element.name}.${rootDomain}`;

      return [
        {
          name: `${this.metadata.shared.helm.oauth2Proxy.name}-admin`,
          chart: this.metadata.shared.helm.oauth2Proxy.chart,
          repository: this.metadata.shared.helm.oauth2Proxy.repository,
          namespace: this.namespace.element.metadata.name,
          createNamespace: false,
          values: [
            yaml.stringify({
              config: {
                existingSecret:
                  this.oauth2ProxyAdminReleaseSecret.element.metadata.name,
                configFile: dedent`
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
                  github_users="${this.metadata.shared.adminGithubUsers.join(',')}"
                  email_domains="*"
              `,
              },

              ingress: {
                enabled: true,
                pathType: 'ImplementationSpecific',
                className: 'nginx',
                hosts: [host],
              },
            }),
          ],
        },
        {
          authUrl: `https://${host}/oauth2/auth`,
          authSignin: `https://${host}/oauth2/start?rd=$scheme://$host$request_uri`,
        },
      ];
    },
  );

  oauth2ProxyContributorRelease = this.provide(
    Release,
    'oauth2ProxyContributorRelease',
    () => {
      const rootDomain =
        this.cloudflareZoneStack.dataAyteneve93Zone.element.name;
      const host = `${this.cloudflareRecordStack.oauth2ProxyContributorRecord.element.name}.${rootDomain}`;

      return [
        {
          name: `${this.metadata.shared.helm.oauth2Proxy.name}-contributor`,
          chart: this.metadata.shared.helm.oauth2Proxy.chart,
          repository: this.metadata.shared.helm.oauth2Proxy.repository,
          namespace: this.namespace.element.metadata.name,
          createNamespace: false,
          values: [
            yaml.stringify({
              config: {
                existingSecret:
                  this.oauth2ProxyContributorReleaseSecret.element.metadata
                    .name,
                configFile: dedent`
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
                github_users="${[
                  ...this.metadata.shared.adminGithubUsers,
                  ...this.metadata.shared.contributorGithubUsers,
                ].join(',')}"
                email_domains="*"
            `,
              },

              ingress: {
                enabled: true,
                pathType: 'ImplementationSpecific',
                className: 'nginx',
                hosts: [host],
              },
            }),
          ],
        },
        {
          authUrl: `https://${host}/oauth2/auth`,
          authSignin: `https://${host}/oauth2/start?rd=$scheme://$host$request_uri`,
        },
      ];
    },
  );
  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
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
