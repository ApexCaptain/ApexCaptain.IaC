import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Workstation_Apps_Istio_Stack } from './istio.stack';
import { K8S_Workstation_Apps_Monitoring_Stack } from './monitoring.stack';
import { AbstractStack, MonitoringPodMonitor } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';

@Injectable()
export class K8S_Workstation_Apps_Monitoring_Resources_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      kubernetes: this.provide(KubernetesProvider, 'kubernetesProvider', () =>
        this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation(),
      ),
    },
  };

  /*
  istioEnvoyStatsPodMonitor = this.provide(
    MonitoringPodMonitor,
    'istioEnvoyStatsPodMonitor',
    id => ({
      manifest: {
        metadata: {
          name: `${this.k8sWorkstationAppsMonitoringStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace:
            this.k8sWorkstationAppsMonitoringStack.namespace.element.metadata
              .name,
          labels: {
            monitoring: 'istio-envoy-proxies',
            release:
              this.k8sWorkstationAppsMonitoringStack.metadata.shared.helm
                .kubePrometheusStack.name,
          },
        },
        spec: {
          selector: {
            matchExpressions: [
              {
                key: 'service.istio.io/canonical-revision',
                operator: 'Exists' as const,
              },
            ],
          },
          namespaceSelector: {
            any: true,
          },
          jobLabel: 'envoy-stats',
          podMetricsEndpoints: [
            {
              path: '/stats/prometheus',
              port: 'http-envoy-prom',
              interval: '15s',
            },
          ],
        },
      },
    }),
  );
  */

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationAppsMonitoringStack: K8S_Workstation_Apps_Monitoring_Stack,
    private readonly k8sWorkstationAppsIstioStack: K8S_Workstation_Apps_Istio_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Monitoring_Resources_Stack.name,
      'K8S Workstation Monitoring Resources Stack',
    );
    this.addDependency(this.k8sWorkstationAppsIstioStack);
  }
}
