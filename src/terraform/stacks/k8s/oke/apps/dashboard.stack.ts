import { Injectable } from '@nestjs/common';
import { AbstractStack, createExpirationInterval } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import _ from 'lodash';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { Fn, LocalBackend } from 'cdktf';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { IngressV1 } from '@lib/terraform/providers/kubernetes/ingress-v1';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare';
import { K8S_Oke_System_Stack } from '../system.stack';
import { ServiceAccountV1 } from '@lib/terraform/providers/kubernetes/service-account-v1';
import { ClusterRoleBindingV1 } from '@lib/terraform/providers/kubernetes/cluster-role-binding-v1';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import path from 'path';
import { SensitiveFile } from '@lib/terraform/providers/local/sensitive-file';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { StaticResource } from '@lib/terraform/providers/time/static-resource';
import { TimeProvider } from '@lib/terraform/providers/time/provider';
import { K8S_Oke_Apps_OAuth2Proxy_Stack } from './oauth2-proxy.stack';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Oke_Apps_Dashboard_Stack extends AbstractStack {
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
      local: this.provide(LocalProvider, 'localProvider', () => ({})),
      time: this.provide(TimeProvider, 'timeProvider', () => ({})),
    },
  };

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.dashboard,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
    },
  }));

  service = this.provide(ServiceV1, 'service', id => [
    {
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      spec: {
        type: 'ExternalName',
        externalName: `${
          this.k8sOkeSystemStack.dataKubernetesDashboardService.element.metadata
            .name
        }.${this.k8sOkeSystemStack.dataNamespace.element.metadata.name}.svc.cluster.local`,
      },
    },
    {
      servicePort:
        this.k8sOkeSystemStack.dataKubernetesDashboardService.shared
          .servicePort,
    },
  ]);

  serviceAccount = this.provide(ServiceAccountV1, 'serviceAccount', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
    },
  }));

  serviceAccountTokenExpiration = this.provide(
    StaticResource,
    'serviceAccountTokenExpiration',
    () => ({
      triggers: {
        expirationDate: createExpirationInterval({
          days: 30,
        }).toString(),
      },
    }),
  );

  serviceAccountToken = this.provide(SecretV1, 'serviceAccountToken', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
      annotations: {
        'kubernetes.io/service-account.name':
          this.serviceAccount.element.metadata.name,
      },
    },
    type: 'kubernetes.io/service-account-token',
    lifecycle: {
      replaceTriggeredBy: [
        `${this.serviceAccountTokenExpiration.element.terraformResourceType}.${this.serviceAccountTokenExpiration.element.friendlyUniqueId}`,
      ],
    },
  }));

  clusterRoleBinding = this.provide(
    ClusterRoleBindingV1,
    'clusterRoleBinding',
    id => ({
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      },
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ClusterRole',
        name: 'cluster-admin',
      },
      subject: [
        {
          kind: 'ServiceAccount',
          name: this.serviceAccount.element.metadata.name,
          namespace: this.namespace.element.metadata.name,
        },
      ],
    }),
  );

  authenticationInfo = this.provide(
    SensitiveFile,
    'authenticationInfo',
    id => ({
      filename: path.join(
        process.cwd(),
        this.globalConfigService.config.terraform.stacks.common
          .generatedKeyFilesDirPaths.relativeSecretsDirPath,
        `${K8S_Oke_Apps_Dashboard_Stack.name}-${id}.json`,
      ),
      content: JSON.stringify(
        {
          dashboardAuthenticationToken: Fn.lookup(
            this.serviceAccountToken.element.data,
            'token',
          ),
        },
        null,
        2,
      ),
    }),
  );

  ingress = this.provide(IngressV1, 'ingress', id => ({
    metadata: {
      name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
      namespace: this.namespace.element.metadata.name,
      annotations: {
        'nginx.ingress.kubernetes.io/backend-protocol': 'HTTPS',
        'nginx.ingress.kubernetes.io/rewrite-target': '/',
        'nginx.ingress.kubernetes.io/auth-url':
          this.k8sOkeAppsOAuth2ProxyStack.oauth2ProxyContributorRelease.shared
            .authUrl,
        'nginx.ingress.kubernetes.io/auth-signin':
          this.k8sOkeAppsOAuth2ProxyStack.oauth2ProxyContributorRelease.shared
            .authSignin,
      },
    },
    spec: {
      ingressClassName: 'nginx',
      rule: [
        {
          host: `${this.cloudflareRecordStack.okeDashboardRecord.element.name}`,
          http: {
            path: [
              {
                path: '/',
                pathType: 'Prefix',
                backend: {
                  service: {
                    name: this.service.element.metadata.name,
                    port: {
                      number: this.service.shared.servicePort,
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
    private readonly k8sOkeAppsOAuth2ProxyStack: K8S_Oke_Apps_OAuth2Proxy_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Dashboard_Stack.name,
      'Dashboard for OKE k8s',
    );
    this.addDependency(this.k8sOkeAppsOAuth2ProxyStack);
  }
}
