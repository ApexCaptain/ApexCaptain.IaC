import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import dedent from 'dedent';
import _ from 'lodash';
import yaml from 'yaml';
import { K8S_Oke_System_Stack } from '../system.stack';
import { K8S_Oke_Apps_Authentik_Resources_Stack } from './authentik.resources.stack';
import { K8S_Oke_Apps_Authentik_Stack } from './authentik.stack';
import { K8S_Oke_Apps_Istio_Gateway_Stack } from './istio.gateway.stack';
import { K8S_Oke_Apps_Istio_Stack } from './istio.stack';
import { K8S_Oke_K8S_Stack } from '../k8s.stack';
import {
  AbstractStack,
  createExpirationInterval,
  IstioAuthorizationPolicy,
  IstioVirtualService,
} from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Cloudflare_Record_Oke_Stack } from '@/terraform/stacks/cloudflare';
import { GitOps_Stack } from '@/terraform/stacks/git-ops.stack';
import { Ocir_Stack } from '@/terraform/stacks/ocir.stack';
import { Project_Stack } from '@/terraform/stacks/project.stack';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Application as AuthentikApplication } from '@lib/terraform/providers/authentik/application';
import { AuthentikProvider } from '@lib/terraform/providers/authentik/provider';
import { ProviderProxy } from '@lib/terraform/providers/authentik/provider-proxy';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { RandomProvider } from '@lib/terraform/providers/random/provider';
import { StringResource } from '@lib/terraform/providers/random/string-resource';

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
          configPath: this.k8sOkeK8SStack.kubeConfigFile.element.filename,
        }),
      ),
      random: this.provide(RandomProvider, 'randomProvider', () => ({})),
      helm: this.provide(HelmProvider, 'helmProvider', () => ({
        kubernetes: {
          configPath: this.k8sOkeK8SStack.kubeConfigFile.element.filename,
        },
      })),
      authentik: this.provide(
        AuthentikProvider,
        'authentikProvider',
        () =>
          this.k8sOkeAppsAuthentikStack.authentikProviderConfig.shared.config,
      ),
    },
  };
  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.argoCd,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'istio-injection': 'enabled',
      },
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

  argoCdRelease = this.provide(Release, 'argoCdRelease', () => {
    const oauthBypassKeyName = 'X-OAuth-Bypass-Key';
    const oauthBypassKeyValue = this.oauthBypassKey.element.result;
    const gitOpsDeployerAccountName = 'gitops-bot';
    const domain = this.cloudflareRecordOkeStack.argoCdRecord.element.name;
    const services = {
      web: {
        name: 'argo-cd-argocd-server',
        port: 80,
      },
    };

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
              domain,
            },
            redisSecretInit: {
              podAnnotations: {
                'sidecar.istio.io/inject': false.toString(),
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
        domain,
        gitOpsDeployerAccountName,
        oauthBypassKeyHeader: {
          name: oauthBypassKeyName,
          value: oauthBypassKeyValue,
        },
        services,
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

  virtualService = this.provide(IstioVirtualService, 'virtualService', id => ({
    manifest: {
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      spec: {
        hosts: [this.argoCdRelease.shared.domain],
        gateways: [
          this.k8sOkeAppsIstioGatewayStack.istioIngressGateway.shared
            .gatewayPath,
        ],
        http: [
          {
            route: [
              {
                destination: {
                  host: this.argoCdRelease.shared.services.web.name,
                  port: {
                    number: this.argoCdRelease.shared.services.web.port,
                  },
                },
              },
            ],
          },
        ],
      },
    },
  }));

  authentikProxyProvider = this.provide(
    ProviderProxy,
    'authentikProxyProvider',
    id => ({
      name: _.startCase(`${this.metadata.shared.namespace}-${id}`),
      mode: 'forward_single',
      internalHost: `http://${this.argoCdRelease.shared.services.web.name}.${this.namespace.element.metadata.name}.svc.cluster.local`,
      externalHost: `https://${this.argoCdRelease.shared.domain}`,
      authorizationFlow:
        this.k8sOkeAppsAuthentikResourcesStack
          .dataDefaultProviderAuthorizationImplicitConsent.element.id,
      invalidationFlow:
        this.k8sOkeAppsAuthentikResourcesStack.dataDefaultInvalidationFlow
          .element.id,
    }),
  );

  authentikApplication = this.provide(
    AuthentikApplication,
    'authentikApplication',
    id => ({
      name: _.startCase(`${this.metadata.shared.namespace}-${id}`),
      slug: _.kebabCase(`${this.metadata.shared.namespace}-${id}`),
      protocolProvider: Fn.tonumber(this.authentikProxyProvider.element.id),
    }),
  );

  authorizationPolicy = this.provide(
    IstioAuthorizationPolicy,
    'authorizationPolicy',
    id => {
      return {
        manifest: {
          metadata: {
            name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
            namespace:
              this.k8sOkeAppsIstioStack.namespace.element.metadata.name,
          },
          spec: {
            selector: {
              matchLabels: {
                istio:
                  this.k8sOkeAppsIstioStack.istioEastWestGatewayRelease.shared
                    .istioLabel,
              },
            },
            action: 'CUSTOM' as const,
            provider: {
              name: this.k8sOkeAppsIstioStack.istiodRelease.shared
                .okeAuthentikProxyProviderName,
            },
            rules: [
              {
                to: [
                  {
                    operation: {
                      hosts: [this.argoCdRelease.shared.domain],
                      notPaths: ['/api/webhook'],
                    },
                  },
                ],
                when: [
                  {
                    key: `request.headers[${this.argoCdRelease.shared.oauthBypassKeyHeader.name}]`,
                    notValues: [
                      this.argoCdRelease.shared.oauthBypassKeyHeader.value,
                    ],
                  },
                ],
              },
            ],
          },
        },
      };
    },
  );

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
    private readonly globalConfigService: GlobalConfigService,

    // Stacks
    private readonly k8sOkeAppsAuthentikStack: K8S_Oke_Apps_Authentik_Stack,
    private readonly projectStack: Project_Stack,
    private readonly ocirStack: Ocir_Stack,
    private readonly k8sOkeK8SStack: K8S_Oke_K8S_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly cloudflareRecordOkeStack: Cloudflare_Record_Oke_Stack,
    private readonly gitOpsStack: GitOps_Stack,
    private readonly k8sOkeAppsIstioStack: K8S_Oke_Apps_Istio_Stack,
    private readonly k8sOkeAppsIstioGatewayStack: K8S_Oke_Apps_Istio_Gateway_Stack,
    private readonly k8sOkeAppsAuthentikResourcesStack: K8S_Oke_Apps_Authentik_Resources_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_ArgoCd_Stack.name,
      'Argo CD for OKE k8s',
    );
  }
}
