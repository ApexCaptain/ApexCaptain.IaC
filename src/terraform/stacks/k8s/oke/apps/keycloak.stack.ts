import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { Release } from '@lib/terraform/providers/helm/release';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { Resource } from '@lib/terraform/providers/null/resource';
import { K8S_Oke_System_Stack } from '../system.stack';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import yaml from 'yaml';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare/record.stack';
import { Cloudflare_Zone_Stack } from '@/terraform/stacks/cloudflare/zone.stack';
import { K8S_Oke_Apps_OAuth2Proxy_Stack } from './oauth2-proxy.stack';
import { K8S_Oke_Apps_Nfs_Stack } from './nfs.stack';

@Injectable()
export class K8S_Oke_Apps_Keycloak_Stack extends AbstractStack {
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
    },
  };

  // private readonly metadata = this.provide(Resource, 'metadata', () => [
  //   {},
  //   this.k8sOkeSystemStack.applicationMetadata.shared.keycloak,
  // ]);

  // namespace = this.provide(NamespaceV1, 'namespace', () => ({
  //   metadata: {
  //     name: this.metadata.shared.namespace,
  //   },
  // }));

  // release = this.provide(Release, 'release', () => {
  //   const host = `${this.cloudflareRecordStack.keycloakRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`;
  //   const adminHost = `${this.cloudflareRecordStack.keycloakAdminRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`;
  //   return {
  //     name: this.metadata.shared.helm.keycloak.name,
  //     chart: `${this.metadata.shared.helm.keycloak.repository}/${this.metadata.shared.helm.keycloak.chart}-24.6.4.tgz`,
  //     namespace: this.namespace.element.metadata.name,
  //     createNamespace: false,
  //     values: [
  //       yaml.stringify({
  //         global: {
  //           defaultStorageClass:
  //             this.k8sOkeAppsNfsStack.release.shared.storageClassName,
  //         },
  //         ingress: {
  //           enabled: true,
  //           ingressClassName: 'nginx',
  //           hostname: host,
  //           hostnameStrict: true,
  //           annotations: {
  //             'nginx.ingress.kubernetes.io/backend-protocol': 'HTTP',
  //             'nginx.ingress.kubernetes.io/rewrite-target': '/',
  //           },
  //           path: '/',
  //         },
  //         adminIngress: {
  //           enabled: true,
  //           ingressClassName: 'nginx',
  //           hostname: adminHost,
  //           annotations: {
  //             'nginx.ingress.kubernetes.io/backend-protocol': 'HTTP',
  //             'nginx.ingress.kubernetes.io/rewrite-target': '/',
  //             'nginx.ingress.kubernetes.io/auth-url':
  //               this.k8sOkeAppsOAuth2ProxyStack.release.shared.authUrl,
  //             'nginx.ingress.kubernetes.io/auth-signin':
  //               this.k8sOkeAppsOAuth2ProxyStack.release.shared.authSignin,
  //           },
  //           path: '/',
  //         },
  //         production: true,
  //         extraEnvVars: [
  //           {
  //             name: 'KC_HOSTNAME',
  //             value: `https://${host}`,
  //           },
  //           {
  //             name: 'KC_HOSTNAME_ADMIN',
  //             value: `https://${adminHost}`,
  //           },
  //           {
  //             name: 'KEYCLOAK_FRONTEND_URL',
  //             value: `https://${adminHost}`,
  //           },
  //           {
  //             name: 'KC_HTTP_ENABLED',
  //             value: 'true',
  //           },
  //           {
  //             name: 'KC_PROXY',
  //             value: 'edge',
  //           },
  //         ],
  //       }),
  //     ],
  //   };
  // });

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly k8sOkeAppsNfsStack: K8S_Oke_Apps_Nfs_Stack,
    private readonly k8sOkeAppsOAuth2ProxyStack: K8S_Oke_Apps_OAuth2Proxy_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Keycloak_Stack.name,
      'Keycloak stack for OKE k8s',
    );
    this.addDependency(this.k8sOkeAppsOAuth2ProxyStack);
    this.addDependency(this.k8sOkeAppsNfsStack);
  }
}
