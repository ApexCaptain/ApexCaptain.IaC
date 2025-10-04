import { TerraformAppService } from '@/terraform/terraform.app.service';
import { Project_Stack } from '@/terraform/stacks/project.stack';
import { Injectable } from '@nestjs/common';
import { K8S_Oke_System_Stack } from '../system.stack';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { Resource } from '@lib/terraform/providers/null/resource';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { AbstractStack, createExpirationInterval } from '@/common';
import { Fn, LocalBackend } from 'cdktf';
import _ from 'lodash';
import yaml from 'yaml';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare/record.stack';
import { K8S_Oke_Apps_OAuth2Proxy_Stack } from './oauth2-proxy.stack';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import dedent from 'dedent';
import { RandomProvider } from '@lib/terraform/providers/random/provider';
import { StringResource } from '@lib/terraform/providers/random/string-resource';
import { Ocir_Stack } from '@/terraform/stacks/ocir.stack';
import { GitOps_Stack } from '@/terraform/stacks/git-ops.stack';

@Injectable()
export class K8S_Oke_Apps_ArgoCd_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.k8s.oke.apps.argoCd;

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
      random: this.provide(RandomProvider, 'randomProvider', () => ({})),
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
  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.argoCd,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
    },
  }));

  apexCaptainOcirRegistryImagePullSecret = this.provide(
    SecretV1,
    'imagePullSecret',
    id => {
      const registry = `${this.projectStack.dataOciHomeRegion.element.regionSubscriptions.get(0).regionName}.ocir.io`;
      const username = `${this.projectStack.dataOciObjectstorageNamespace.element.namespace}/${this.ocirStack.cdResource.shared.user.element.name}`;
      const password = this.ocirStack.cdResource.shared.authToken.element.token;
      const auth = Fn.base64encode(`${username}:${password}`);

      return [
        {
          metadata: {
            name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
            namespace: this.namespace.element.metadata.name,
          },
          type: 'kubernetes.io/dockerconfigjson',
          data: {
            '.dockerconfigjson': JSON.stringify({
              auths: {
                [registry]: {
                  auth,
                },
              },
            }),
          },
        },
        {
          apiUrl: `https://${registry}`,
          registry,
        },
      ];
    },
  );

  oauthBypassKey = this.provide(StringResource, 'argoCdBypassKey', () => ({
    length: 32,
    special: false,
    keepers: {
      expirationDate: createExpirationInterval({
        days: 30,
      }).toString(),
    },
  }));

  gitOpsRepositorySecret = this.provide(
    SecretV1,
    'gitOpsRepositorySecret',
    id => ({
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
        labels: {
          'argocd.argoproj.io/secret-type': 'repository',
        },
      },
      data: {
        url: this.gitOpsStack.gitOpsGithubRepository.element.sshCloneUrl,
        sshPrivateKey:
          this.gitOpsStack.deployKeyPrivateKy.element.privateKeyOpenssh,
      },
    }),
  );

  argoCdRelease = this.provide(Release, 'argoCdRelease', () => {
    const oauthBypassKeyName = 'X-OAuth-Bypass-Key';
    const oauthBypassKeyValue = this.oauthBypassKey.element.result;
    const gitOpsDeployerAccountName = 'gitops-bot';
    return [
      {
        name: this.metadata.shared.helm.argoCd.name,
        chart: this.metadata.shared.helm.argoCd.chart,
        repository: this.metadata.shared.helm.argoCd.repository,
        namespace: this.namespace.element.metadata.name,
        createNamespace: false,
        values: [
          yaml.stringify({
            global: {
              domain: this.cloudflareRecordStack.argoCdRecord.element.name,
            },
            server: {
              ingress: {
                enabled: true,
                annotations: {
                  'nginx.ingress.kubernetes.io/backend-protocol': 'HTTP',
                  'nginx.ingress.kubernetes.io/rewrite-target': '/',
                  'nginx.ingress.kubernetes.io/auth-url':
                    this.k8sOkeAppsOAuth2ProxyStack.oauth2ProxyAdminRelease
                      .shared.authUrl,
                  'nginx.ingress.kubernetes.io/auth-signin':
                    this.k8sOkeAppsOAuth2ProxyStack.oauth2ProxyAdminRelease
                      .shared.authSignin,
                  'nginx.ingress.kubernetes.io/auth-snippet': dedent`
                    if ($request_uri ~ "/api/webhook") {
                      return 200;
                    }
                    if ($http_${oauthBypassKeyName.toLowerCase().replace(/-/g, '_')} = "${oauthBypassKeyValue}") {
                        return 200;
                    }
                  `,
                },
                ingressClassName: 'nginx',
              },
            },
            configs: {
              cm: {
                [`accounts.${gitOpsDeployerAccountName}`]: 'apiKey',
              },
              rbac: {
                'policy.csv': dedent`
                  p, role:deployer, applications, *, */*, allow
                  p, role:deployer, applicationprojects, get, default, allow
                  g, ${gitOpsDeployerAccountName}, role:deployer
                `,
              },
              params: {
                // @Note Cloudflare의 TLS를 사용
                'server.insecure': true,
              },
              secret: {
                argocdServerAdminPassword: this.config.adminPasswordBcryted,
                githubSecret: this.gitOpsStack.webHookKey.element.result,
              },
            },
          }),
        ],
      },
      {
        domain: this.cloudflareRecordStack.argoCdRecord.element.name,
        gitOpsDeployerAccountName,
        oauthBypassKeyHeader: {
          name: oauthBypassKeyName,
          value: oauthBypassKeyValue,
        },
      },
    ];
  });

  argoCdImageUpdaterRelease = this.provide(
    Release,
    'argoCdImageUpdaterRelease',
    () => {
      const values = [
        yaml.stringify({
          config: {
            gitCommitUser: 'ArgoCD Image Update Bot by ApexCaptain',
            gitCommitMail: 'argocd-image-updater@argocd.local',
            gitCommitTemplate: dedent`
                build: automatic update of {{ .AppName }}

                {{ range .AppChanges -}}
                updates image {{ .Image }} tag '{{ .OldTag }}' to '{{ .NewTag }}'
                {{ end -}}
            `,

            registries: [
              {
                name: this.apexCaptainOcirRegistryImagePullSecret.element
                  .metadata.name,
                api_url:
                  this.apexCaptainOcirRegistryImagePullSecret.shared.apiUrl,
                prefix:
                  this.apexCaptainOcirRegistryImagePullSecret.shared.registry,
                ping: 'yes',
                insecure: 'no',
                credentials: `pullsecret:${this.namespace.element.metadata.name}/${this.apexCaptainOcirRegistryImagePullSecret.element.metadata.name}`,
              },
            ],
          },
        }),
      ];
      return {
        dependsOn: [this.argoCdRelease.element],
        name: this.metadata.shared.helm.argoCdImageUpdater.name,
        chart: this.metadata.shared.helm.argoCdImageUpdater.chart,
        repository: this.metadata.shared.helm.argoCdImageUpdater.repository,
        namespace: this.namespace.element.metadata.name,
        createNamespace: false,
        values,
      };
    },
  );

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
    private readonly globalConfigService: GlobalConfigService,

    // Stacks
    private readonly projectStack: Project_Stack,
    private readonly ocirStack: Ocir_Stack,
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly k8sOkeAppsOAuth2ProxyStack: K8S_Oke_Apps_OAuth2Proxy_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
    private readonly gitOpsStack: GitOps_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_ArgoCd_Stack.name,
      'Argo CD for OKE k8s',
    );
    this.addDependency(this.k8sOkeAppsOAuth2ProxyStack);
  }
}
