import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Oke_Apps_Monitoring_Stack } from './monitoring.stack';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { K8S_Oke_Apps_Istio_Stack } from './istio.stack';
import {
  AbstractStack,
  MonitoringPodMonitor,
  MonitoringServiceMonitor,
} from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';

@Injectable()
export class K8S_Oke_Apps_Monitoring_Resources_Stack extends AbstractStack {
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
    },
  };

  istiodServiceMonitor = this.provide(
    MonitoringServiceMonitor,
    'istiodServiceMonitor',
    id => ({
      manifest: {
        metadata: {
          name: `${this.k8sOkeAppsMonitoringStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace:
            this.k8sOkeAppsMonitoringStack.namespace.element.metadata.name,
          labels: {
            monitoring: 'istio-control-plane',
            release:
              this.k8sOkeAppsMonitoringStack.metadata.shared.helm
                .kubePrometheusStack.name,
          },
        },
        spec: {
          jobLabel: 'istiod',
          targetLabels: ['app'],
          selector: {
            matchExpressions: [
              {
                key: 'istio',
                operator: 'In' as const,
                values: ['pilot'],
              },
            ],
          },
          namespaceSelector: {
            matchNames: [
              this.k8sOkeAppsIstioStack.namespace.element.metadata.name,
            ],
          },
          endpoints: [
            {
              port: 'http-monitoring',
              interval: '15s',
            },
          ],
        },
      },
    }),
  );

  istioEnvoyStatsPodMonitor = this.provide(
    MonitoringPodMonitor,
    'istioEnvoyStatsPodMonitor',
    id => ({
      manifest: {
        metadata: {
          name: `${this.k8sOkeAppsMonitoringStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
          namespace:
            this.k8sOkeAppsMonitoringStack.namespace.element.metadata.name,
          labels: {
            monitoring: 'istio-envoy-proxies',
            release:
              this.k8sOkeAppsMonitoringStack.metadata.shared.helm
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

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeAppsMonitoringStack: K8S_Oke_Apps_Monitoring_Stack,
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
    private readonly k8sOkeAppsIstioStack: K8S_Oke_Apps_Istio_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_Monitoring_Resources_Stack.name,
      'K8S OKE Monitoring Resources Stack',
    );
    this.addDependency(this.k8sOkeAppsIstioStack);
  }
}
