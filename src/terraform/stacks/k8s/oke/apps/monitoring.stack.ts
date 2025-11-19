import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import _ from 'lodash';
import Timezone from 'timezone-enum';
import yaml from 'yaml';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { K8S_Oke_System_Stack } from '../system.stack';
import { K8S_Oke_Apps_Authentik_Resources_Stack } from './authentik.resources.stack';
import { K8S_Oke_Apps_Authentik_Stack } from './authentik.stack';
import { K8S_Oke_Apps_Istio_Gateway_Stack } from './istio.gateway.stack';
import { K8S_Oke_Apps_Istio_Stack } from './istio.stack';
import { K8S_Oke_Apps_KialiOperator_Stack } from './kiali-operator.stack';
import { K8S_Oke_Apps_Nfs_Stack } from './nfs.stack';
import { K8S_Workstation_Apps_Istio_Stack } from '../../workstation/apps/istio.stack';
import { K8S_Oke_Network_Stack } from '../network.stack';
import {
  AbstractStack,
  IstioAuthorizationPolicy,
  IstioVirtualService,
  Kiali,
} from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Cloudflare_Record_Oke_Stack } from '@/terraform/stacks/cloudflare';
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
    this.k8sOkeSystemStack.applicationMetadata.shared.monitoring,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'istio-injection': 'disabled',
      },
    },
  }));

  grafanaDashboardResources = this.provide(
    Resource,
    'grafanaDashboardResources',
    () => {
      const dataSources = {
        Default_Prometheus: 'Prometheus',
        Loki: 'Loki',
      };

      const dashboardConfiguration: {
        [key: string]: {
          [key: string]: {
            gnetId: number;
            revision: number;
            datasource: string;
          };
        };
      } = {
        'custom-node-exporter': {
          /**
           * @See https://grafana.com/grafana/dashboards/1860-node-exporter-full/
           */
          'node-exporter-full': {
            gnetId: 1860,
            revision: 42,
            datasource: dataSources.Default_Prometheus,
          },
        },

        // https://grafana.com/orgs/istio/dashboards
        istio: {
          /**
           * @See https://grafana.com/grafana/dashboards/7645-istio-control-plane-dashboard/
           */
          'istio-control-plane-dashboard': {
            gnetId: 7645,
            revision: 278,
            datasource: dataSources.Default_Prometheus,
          },
          /**
           * @See https://grafana.com/grafana/dashboards/7639-istio-mesh-dashboard/
           */
          'istio-mesh-dashboard': {
            gnetId: 7639,
            revision: 278,
            datasource: dataSources.Default_Prometheus,
          },
          /**
           * @See https://grafana.com/grafana/dashboards/11829-istio-performance-dashboard/
           */
          'istio-performance-dashboard': {
            gnetId: 11829,
            revision: 278,
            datasource: dataSources.Default_Prometheus,
          },
          /**
           * @See https://grafana.com/grafana/dashboards/7636-istio-service-dashboard/
           */
          'istio-service-dashboard': {
            gnetId: 7636,
            revision: 278,
            datasource: dataSources.Default_Prometheus,
          },
          /**
           * @See https://grafana.com/grafana/dashboards/7630-istio-workload-dashboard/
           */
          'istio-workload-dashboard': {
            gnetId: 7630,
            revision: 278,
            datasource: dataSources.Default_Prometheus,
          },
        },

        loki: {
          /**
           * @See https://grafana.com/grafana/dashboards/13639-logs-app/
           */
          'logs-app': {
            gnetId: 13639,
            revision: 2,
            datasource: dataSources.Loki,
          },
        },
      };

      const dahsboards = Object.entries(dashboardConfiguration).reduce(
        (acc, [providerName, providerDashboards]) => {
          const provider = acc[providerName] || {};
          Object.entries(providerDashboards).forEach(
            ([dashboardName, dashboard]) => {
              provider[dashboardName] = dashboard;
            },
          );
          acc[providerName] = provider;
          return acc;
        },
        {},
      );
      const dashboardProviders = {
        'dashboardproviders.yaml': {
          apiVersion: 1,
          providers: Object.entries(dashboardConfiguration).map(
            ([providerName]) => {
              return {
                name: providerName,
                folder: _.startCase(providerName),
                type: 'file',
                options: {
                  path: `/var/lib/grafana/dashboards/${providerName}`,
                },
              };
            },
          ),
        },
      };
      return [{}, { dahsboards, dashboardProviders, dataSources }];
    },
  );

  // Helm Charts
  kubePrometheusStackRelease = this.provide(
    Release,
    'kubePrometheusStackRelease',
    () => {
      const prometheusServiceName = `${this.metadata.shared.helm.kubePrometheusStack.name}-prometheus`;
      const prometheusServicePort = 9090;
      const prometheusServiceFqdn = `${prometheusServiceName}.${this.namespace.element.metadata.name}.svc.cluster.local`;
      const grafanaServiceName = `${this.metadata.shared.helm.kubePrometheusStack.name}-grafana`;
      const grafanaServicePort = 80;
      const grafanaServiceFqdn = `${grafanaServiceName}.${this.namespace.element.metadata.name}.svc.cluster.local`;

      return [
        {
          name: this.metadata.shared.helm.kubePrometheusStack.name,
          chart: this.metadata.shared.helm.kubePrometheusStack.chart,
          repository: this.metadata.shared.helm.kubePrometheusStack.repository,
          namespace: this.namespace.element.metadata.name,
          createNamespace: false,
          values: [
            // Prometheus
            yaml.stringify({
              prometheus: {
                enabled: true,
                prometheusSpec: {
                  externalLabels: {
                    cluster:
                      this.globalConfigService.config.terraform.stacks.k8s
                        .serviceMesh.okeClusterName,
                  },
                  enableRemoteWriteReceiver: true,
                  resources: {
                    requests: {
                      cpu: '300m',
                      memory: '512Mi',
                    },
                    limits: {
                      cpu: '1',
                      memory: '2Gi',
                    },
                  },
                  storageSpec: {
                    volumeClaimTemplate: {
                      spec: {
                        storageClassName:
                          this.k8sOkeAppsNfsStack.release.shared
                            .storageClassName,
                        accessModes: ['ReadWriteOnce'],
                        resources: {
                          requests: {
                            storage: '50Gi',
                          },
                        },
                      },
                    },
                  },
                },
              },
            }),

            // Grafana
            yaml.stringify({
              grafana: {
                enabled: true,
                defaultDashboardsTimezone: Timezone['Asia/Seoul'],
                adminUser: this.config.grafana.adminUser,
                adminPassword: this.config.grafana.adminPassword,
                persistence: {
                  enabled: true,
                  type: 'sts',
                  storageClassName:
                    this.k8sOkeAppsNfsStack.release.shared.storageClassName,
                  accessModes: ['ReadWriteOnce'],
                  size: '20Gi',
                  finalizers: ['kubernetes.io/pvc-protection'],
                },
                dashboards: this.grafanaDashboardResources.shared.dahsboards,
                dashboardProviders:
                  this.grafanaDashboardResources.shared.dashboardProviders,
                additionalDataSources: [
                  {
                    name: this.grafanaDashboardResources.shared.dataSources
                      .Loki,
                    type: 'loki',
                    access: 'proxy',
                    url: `http://${this.lokiStackRelease.shared.serviceFqdn}:${this.lokiStackRelease.shared.servicePort}`,
                    isDefault: false,
                    jsonData: {
                      maxLines: 1000,
                    },
                  },
                ],
              },
            }),

            // AlertManager
            // @ToDo 추후 Slack/Gmail등 알림 채널 연동 필요
            yaml.stringify({
              alertmanager: {
                enabled: false,
              },
            }),
          ],
        },
        {
          prometheusServiceName,
          prometheusServicePort,
          prometheusServiceFqdn,
          grafanaServiceName,
          grafanaServicePort,
          grafanaServiceFqdn,
        },
      ];
    },
  );

  lokiStackRelease = this.provide(Release, 'lokiStackRelease', () => {
    const serviceName = `${this.metadata.shared.helm.lokiStack.name}`;
    const servicePort = 3100;
    const serviceFqdn = `${serviceName}.${this.namespace.element.metadata.name}.svc.cluster.local`;
    return [
      {
        name: this.metadata.shared.helm.lokiStack.name,
        chart: this.metadata.shared.helm.lokiStack.chart,
        repository: this.metadata.shared.helm.lokiStack.repository,
        namespace: this.namespace.element.metadata.name,
        createNamespace: false,
        values: [
          // Loki
          yaml.stringify({
            loki: {
              enabled: true,
              persistence: {
                enabled: true,
                storageClassName:
                  this.k8sOkeAppsNfsStack.release.shared.storageClassName,
                accessModes: ['ReadWriteOnce'],
                size: '20Gi',
              },
              resources: {
                requests: {
                  cpu: '300m',
                  memory: '512Mi',
                },
                limits: {
                  cpu: '500m',
                  memory: '1024Mi',
                },
              },
              config: {
                limits_config: {
                  max_streams_per_user: 10000,
                  ingestion_rate_mb: 100,
                  ingestion_burst_size_mb: 200,
                },
              },
            },
          }),
          // Promtail
          yaml.stringify({
            promtail: {
              enabled: true,
              config: {
                clients: [
                  {
                    url: `http://${serviceFqdn}:${servicePort}/loki/api/v1/push`,
                    external_labels: {
                      cluster:
                        this.globalConfigService.config.terraform.stacks.k8s
                          .serviceMesh.okeClusterName,
                    },
                  },
                ],
              },
              resources: {
                requests: {
                  cpu: '100m',
                  memory: '128Mi',
                },
                limits: {
                  cpu: '200m',
                  memory: '256Mi',
                },
              },
            },
          }),
          // Grafana
          // 별도 설치
          yaml.stringify({
            grafana: {
              enabled: false,
            },
          }),
        ],
      },
      {
        serviceName,
        servicePort,
        serviceFqdn,
      },
    ];
  });

  kialiWorkstationClusterSecret = this.provide(
    SecretV1,
    'kialiWorkstationClusterSecret',
    id => {
      const targetClusterName =
        this.globalConfigService.config.terraform.stacks.k8s.serviceMesh
          .workstationClusterName;
      const targetContextName = 'workstation-context';
      const targetServiceAccountName =
        this.k8sWorkstationAppsIstioStack.kialiRemoteAccessServiceAccount
          .element.metadata.name;

      const kubeConfig = {
        apiVersion: 'v1',
        kind: 'Config',
        clusters: [
          {
            name: targetClusterName,
            cluster: {
              server: this.config.workstationClusterServer,
              'certificate-authority-data': Fn.base64encode(
                Fn.lookup(
                  this.k8sWorkstationAppsIstioStack
                    .kialiRemoteAccessServiceAccountSecret.element.data,
                  'ca.crt',
                ),
              ),
            },
          },
        ],
        users: [
          {
            name: targetServiceAccountName,
            user: {
              token: Fn.lookup(
                this.k8sWorkstationAppsIstioStack
                  .kialiRemoteAccessServiceAccountSecret.element.data,
                'token',
              ),
            },
          },
        ],
        contexts: [
          {
            name: targetContextName,
            context: {
              cluster: targetClusterName,
              user: targetServiceAccountName,
            },
          },
        ],
        'current-context': targetContextName,
      };

      return {
        metadata: {
          name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace: this.namespace.element.metadata.name,
          labels: {
            'kiali.io/multiCluster': 'true',
          },
          annotations: {
            'kiali.io/cluster': targetClusterName,
          },
        },
        data: {
          [targetClusterName]: yaml.stringify(kubeConfig),
        },
        type: 'Opaque',
      };
    },
  );

  // Operator
  kiali = this.provide(Kiali, 'kiali', id => {
    const serviceName = 'kiali';
    const servicePort = 20001;
    const serviceFqdn = `${serviceName}.${this.namespace.element.metadata.name}.svc.cluster.local`;
    return [
      {
        manifest: {
          metadata: {
            name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
            namespace: this.namespace.element.metadata.name,
          },
          spec: {
            auth: {
              // @ToDO 추후 Authentik OIDC 방식으로 변경, 우선은 Authentik Proxy Provider 방식으로 구현
              strategy: 'anonymous' as const,
            },
            deployment: {
              namespace: this.namespace.element.metadata.name,
              accessible_namespaces: ['*'],
            },
            external_services: {
              prometheus: {
                url: `http://${this.kubePrometheusStackRelease.shared.prometheusServiceFqdn}:${this.kubePrometheusStackRelease.shared.prometheusServicePort}`,
              },
              grafana: {
                enabled: true,
                in_cluster_url: `http://${this.kubePrometheusStackRelease.shared.grafanaServiceFqdn}:${this.kubePrometheusStackRelease.shared.grafanaServicePort}`,
                url: `https://${this.cloudflareRecordOkeStack.grafanaRecord.element.name}`,
              },
            },
          },
        },
      },
      {
        serviceName,
        servicePort,
        serviceFqdn,
      },
    ];
  });

  // Ingress
  // Grafana
  grafanaVirtualService = this.provide(
    IstioVirtualService,
    'grafanaVirtualService',
    id => ({
      manifest: {
        metadata: {
          name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace: this.namespace.element.metadata.name,
        },
        spec: {
          hosts: [this.cloudflareRecordOkeStack.grafanaRecord.element.name],
          gateways: [
            this.k8sOkeAppsIstioGatewayStack.istioIngressGateway.shared
              .gatewayPath,
          ],
          http: [
            {
              route: [
                {
                  destination: {
                    host: this.kubePrometheusStackRelease.shared
                      .grafanaServiceName,
                    port: {
                      number:
                        this.kubePrometheusStackRelease.shared
                          .grafanaServicePort,
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    }),
  );

  grafanaAuthentikProxyProvider = this.provide(
    ProviderProxy,
    'grafanaAuthentikProxyProvider',
    id => ({
      name: _.startCase(`${this.metadata.shared.namespace}-${id}`),
      mode: 'forward_single',
      internalHost: `http://${this.kubePrometheusStackRelease.shared.grafanaServiceFqdn}`,
      externalHost: `https://${this.cloudflareRecordOkeStack.grafanaRecord.element.name}`,
      authorizationFlow:
        this.k8sOkeAppsAuthentikResourcesStack
          .dataDefaultProviderAuthorizationImplicitConsent.element.id,
      invalidationFlow:
        this.k8sOkeAppsAuthentikResourcesStack.dataDefaultInvalidationFlow
          .element.id,
    }),
  );

  grafanaAuthentikApplication = this.provide(
    AuthentikApplication,
    'grafanaAuthentikApplication',
    id => ({
      name: _.startCase(`${this.metadata.shared.namespace}-${id}`),
      slug: _.kebabCase(`${this.metadata.shared.namespace}-${id}`),
      protocolProvider: Fn.tonumber(
        this.grafanaAuthentikProxyProvider.element.id,
      ),
    }),
  );

  grafanaAuthorizationPolicy = this.provide(
    IstioAuthorizationPolicy,
    'grafanaAuthorizationPolicy',
    id => ({
      manifest: {
        metadata: {
          name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace: this.k8sOkeAppsIstioStack.namespace.element.metadata.name,
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
                    hosts: [
                      this.cloudflareRecordOkeStack.grafanaRecord.element.name,
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    }),
  );

  // Kiali
  kialiVirtualService = this.provide(
    IstioVirtualService,
    'kialiVirtualService',
    id => ({
      manifest: {
        metadata: {
          name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace: this.namespace.element.metadata.name,
        },
        spec: {
          hosts: [this.cloudflareRecordOkeStack.kialiRecord.element.name],
          gateways: [
            this.k8sOkeAppsIstioGatewayStack.istioIngressGateway.shared
              .gatewayPath,
          ],
          http: [
            {
              route: [
                {
                  destination: {
                    host: this.kiali.shared.serviceName,
                    port: {
                      number: this.kiali.shared.servicePort,
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    }),
  );

  kialiAuthentikProxyProvider = this.provide(
    ProviderProxy,
    'kialiAuthentikProxyProvider',
    id => ({
      name: _.startCase(`${this.metadata.shared.namespace}-${id}`),
      mode: 'forward_single',
      internalHost: `http://${this.kiali.shared.serviceFqdn}`,
      externalHost: `https://${this.cloudflareRecordOkeStack.kialiRecord.element.name}`,
      authorizationFlow:
        this.k8sOkeAppsAuthentikResourcesStack
          .dataDefaultProviderAuthorizationImplicitConsent.element.id,
      invalidationFlow:
        this.k8sOkeAppsAuthentikResourcesStack.dataDefaultInvalidationFlow
          .element.id,
    }),
  );

  kialiAuthentikApplication = this.provide(
    AuthentikApplication,
    'kialiAuthentikApplication',
    id => ({
      name: _.startCase(`${this.metadata.shared.namespace}-${id}`),
      slug: _.kebabCase(`${this.metadata.shared.namespace}-${id}`),
      protocolProvider: Fn.tonumber(
        this.kialiAuthentikProxyProvider.element.id,
      ),
    }),
  );

  kialiAuthorizationPolicy = this.provide(
    IstioAuthorizationPolicy,
    'kialiAuthorizationPolicy',
    id => ({
      manifest: {
        metadata: {
          name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace: this.k8sOkeAppsIstioStack.namespace.element.metadata.name,
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
                    hosts: [
                      this.cloudflareRecordOkeStack.kialiRecord.element.name,
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    }),
  );

  // Prometheus
  prometheusDirectVirtualService = this.provide(
    IstioVirtualService,
    'prometheusDirectVirtualService',
    id => ({
      manifest: {
        metadata: {
          name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace: this.namespace.element.metadata.name,
        },
        spec: {
          hosts: ['*'],
          gateways: [
            this.k8sOkeAppsIstioGatewayStack.istioDirectGateway.shared
              .gatewayPath,
          ],
          http: [
            {
              match: [
                {
                  port: this.k8sOkeNetworkStack.loadbalancerPortMappings
                    .prometheusRemoteWritePort.inbound,
                },
              ],
              route: [
                {
                  destination: {
                    host: this.kubePrometheusStackRelease.shared
                      .prometheusServiceName,
                    port: {
                      number:
                        this.kubePrometheusStackRelease.shared
                          .prometheusServicePort,
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    }),
  );

  // Loki
  lokiDirectVirtualService = this.provide(
    IstioVirtualService,
    'lokiDirectVirtualService',
    id => ({
      manifest: {
        metadata: {
          name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace: this.namespace.element.metadata.name,
        },
        spec: {
          hosts: ['*'],
          gateways: [
            this.k8sOkeAppsIstioGatewayStack.istioDirectGateway.shared
              .gatewayPath,
          ],
          http: [
            {
              match: [
                {
                  port: this.k8sOkeNetworkStack.loadbalancerPortMappings
                    .lokiRemoteWritePort.inbound,
                },
              ],
              route: [
                {
                  destination: {
                    host: this.lokiStackRelease.shared.serviceName,
                    port: {
                      number: this.lokiStackRelease.shared.servicePort,
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    }),
  );

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Stacks
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly cloudflareRecordOkeStack: Cloudflare_Record_Oke_Stack,
    private readonly k8sOkeAppsNfsStack: K8S_Oke_Apps_Nfs_Stack,
    private readonly k8sOkeAppsIstioStack: K8S_Oke_Apps_Istio_Stack,
    private readonly k8sOkeAppsIstioGatewayStack: K8S_Oke_Apps_Istio_Gateway_Stack,
    private readonly k8sOkeAppsAuthentikStack: K8S_Oke_Apps_Authentik_Stack,
    private readonly k8sOkeAppsAuthentikResourcesStack: K8S_Oke_Apps_Authentik_Resources_Stack,
    private readonly k8sOkeAppsKialiOperatorStack: K8S_Oke_Apps_KialiOperator_Stack,
    private readonly k8sOkeNetworkStack: K8S_Oke_Network_Stack,
    private readonly k8sWorkstationAppsIstioStack: K8S_Workstation_Apps_Istio_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Monitoring_Stack.name,
      'Monitoring stack for oke k8s',
    );
    this.addDependency(this.k8sOkeAppsIstioStack);
    this.addDependency(this.k8sOkeAppsKialiOperatorStack);
  }
}
