import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import yaml from 'yaml';
import { K8S_Oke_Network_Stack } from '../../oke/network.stack';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Cloudflare_Record_Oke_Stack } from '@/terraform/stacks/cloudflare';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Workstation_Apps_Monitoring_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      kubernetes: this.provide(KubernetesProvider, 'kubernetesProvider', () =>
        this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation(),
      ),
      helm: this.provide(HelmProvider, 'helmProvider', () => ({
        kubernetes: {
          configPath:
            this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation()
              .configPath,
          insecure: true,
        },
      })),
    },
  };

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sWorkstationSystemStack.applicationMetadata.shared.monitoring,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'istio-injection': 'disabled',
      },
    },
  }));

  // Helm Charts
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
          // Prometheus
          yaml.stringify({
            prometheus: {
              enabled: true,
              prometheusSpec: {
                externalLabels: {
                  cluster:
                    this.globalConfigService.config.terraform.stacks.k8s
                      .serviceMesh.workstationClusterName,
                },
                remoteWrite: [
                  {
                    url: `https://${this.cloudflareRecordOkeStack.okeDirectRecord.element.name}:${this.k8sOkeNetworkStack.loadbalancerPortMappings.prometheusRemoteWritePort.inbound}/api/v1/write`,
                  },
                ],
                resources: {
                  requests: {
                    cpu: '500m',
                    memory: '1024Mi',
                  },
                  limits: {
                    cpu: '1',
                    memory: '2Gi',
                  },
                },
              },
            },
          }),

          // Grafana
          yaml.stringify({
            grafana: {
              enabled: false,
            },
          }),

          // AlertManager
          yaml.stringify({
            alertmanager: {
              enabled: false,
            },
          }),
        ],
      };
    },
  );

  lokiStackRelease = this.provide(Release, 'lokiStackRelease', () => {
    return {
      name: this.metadata.shared.helm.lokiStack.name,
      chart: this.metadata.shared.helm.lokiStack.chart,
      repository: this.metadata.shared.helm.lokiStack.repository,
      namespace: this.namespace.element.metadata.name,
      createNamespace: false,
      values: [
        // Loki
        // OKE의 Loki로 전송
        yaml.stringify({
          loki: {
            enabled: false,
          },
        }),
        // Promtail
        yaml.stringify({
          promtail: {
            enabled: true,
            config: {
              clients: [
                {
                  url: `https://${this.cloudflareRecordOkeStack.okeDirectRecord.element.name}:${this.k8sOkeNetworkStack.loadbalancerPortMappings.lokiRemoteWritePort.inbound}/loki/api/v1/push`,
                  external_labels: {
                    cluster:
                      this.globalConfigService.config.terraform.stacks.k8s
                        .serviceMesh.workstationClusterName,
                  },
                },
              ],
            },
            resources: {
              requests: {
                cpu: '200m',
                memory: '512Mi',
              },
              limits: {
                cpu: '400m',
                memory: '1Gi',
              },
            },
          },
        }),

        // Grafana
        // OKE의 Grafana로 대체
        yaml.stringify({
          grafana: {
            enabled: false,
          },
        }),
      ],
    };
  });

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Stacks
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
    private readonly cloudflareRecordOkeStack: Cloudflare_Record_Oke_Stack,
    private readonly k8sOkeNetworkStack: K8S_Oke_Network_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Monitoring_Stack.name,
      'Monitoring stack for workstation k8s',
    );
  }
}
