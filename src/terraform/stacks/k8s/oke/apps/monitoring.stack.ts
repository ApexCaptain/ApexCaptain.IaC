import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import Timezone from 'timezone-enum';
import yaml from 'yaml';
import { K8S_Oke_Apps_OAuth2Proxy_Stack } from './oauth2-proxy.stack';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { K8S_Oke_System_Stack } from '../system.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Oke_Apps_Monitoring_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.k8s.oke.apps.monitoring;

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

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.monitoring,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
    },
  }));

  // https://grafana-oke.ayteneve93.com
  /*
  kubePrometheusStackRelease = this.provide(
    Release,
    'kubePrometheusStackRelease',
    () => {
      return {
        name: this.metadata.shared.helm.kubePrometheusStack.name,
        chart: this.metadata.shared.helm.kubePrometheusStack.chart,
        repository: this.metadata.shared.helm.kubePrometheusStack.repository,
        namespace: this.namespace.element.metadata.name,
        createNamespace: false,
        values: [
          yaml.stringify({
            // Grafana
            grafana: {
              defaultDashboardsTimezone: Timezone['Asia/Seoul'],
              adminUser: this.config.grafana.adminUser,
              adminPassword: this.config.grafana.adminPassword,
              ingress: {
                enabled: true,
                ingressClassName: 'nginx',
                annotations: {
                  'nginx.ingress.kubernetes.io/backend-protocol': 'HTTP',
                  'nginx.ingress.kubernetes.io/rewrite-target': '/',
                  'nginx.ingress.kubernetes.io/auth-url':
                    this.k8sOkeAppsOAuth2ProxyStack.oauth2ProxyAdminRelease
                      .shared.authUrl,
                  'nginx.ingress.kubernetes.io/auth-signin':
                    this.k8sOkeAppsOAuth2ProxyStack.oauth2ProxyAdminRelease
                      .shared.authSignin,
                },
                hosts: [
                  this.cloudflareRecordStack.grafanaOkeRecord.element.name,
                ],
              },
              dashboards: {
                'node-exporter': {
                  'node-exporter-full': {
                    gnetId: 1860,
                    revision: 36,
                    datasource: 'Prometheus',
                  },
                },
              },
              dashboardProviders: {
                'dashboardproviders.yaml': {
                  apiVersion: 1,
                  providers: [
                    {
                      name: 'node-exporter',
                      folder: 'Node Exporter',
                      type: 'file',
                      options: {
                        path: '/var/lib/grafana/dashboards/node-exporter',
                      },
                    },
                  ],
                },
              },
            },
          }),
        ],
      };
    },
  );
  */

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Stacks
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
    private readonly k8sOkeAppsOAuth2ProxyStack: K8S_Oke_Apps_OAuth2Proxy_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Monitoring_Stack.name,
      'Monitoring stack for oke k8s',
    );
    this.addDependency(this.k8sOkeAppsOAuth2ProxyStack);
  }
}
