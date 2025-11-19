import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import yaml from 'yaml';
import { K8S_Workstation_Apps_IngressController_Stack } from './ingress-controller.stack';
import { K8S_Workstation_Apps_Istio_Stack } from './istio.stack';
import { K8S_Workstation_Apps_Nas_Stack } from './nas.stack';
import { AbstractStack, IstioAuthorizationPolicy } from '@/common';
import { Cloudflare_Record_Workstation_Stack } from '@/terraform/stacks/cloudflare';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';

@Injectable()
export class K8S_Workstation_Apps_NAS_Jellyfin_Stack extends AbstractStack {
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

  /**
   * @see https://developer.nvidia.com/video-encode-and-decode-gpu-support-matrix-new
   */

  jellyfinRelease = this.provide(Release, 'jellyfinRelease', () => {
    const serviceName = 'jellyfin';
    const serviceAccountName = 'jellyfin';
    const customPodLabelKey = 'app';
    const customPodLabelValue = 'jellyfin';

    return [
      {
        name: this.k8sWorkstationAppsNasStack.metadata.shared.helm.jellyfin
          .name,
        chart:
          this.k8sWorkstationAppsNasStack.metadata.shared.helm.jellyfin.chart,
        repository:
          this.k8sWorkstationAppsNasStack.metadata.shared.helm.jellyfin
            .repository,
        namespace:
          this.k8sWorkstationAppsNasStack.namespace.element.metadata.name,
        createNamespace: false,
        values: [
          yaml.stringify({
            image: {
              pullPolicy: 'Always',
            },
            serviceAccount: {
              name: serviceAccountName,
            },
            podLabels: {
              [customPodLabelKey]: customPodLabelValue,
            },
            runtimeClassName: 'nvidia',
            ingress: {
              enabled: true,
              annotations: {
                'nginx.ingress.kubernetes.io/service-upstream': 'true',
                'nginx.ingress.kubernetes.io/upstream-vhost': `${serviceName}.${this.k8sWorkstationAppsNasStack.namespace.element.metadata.name}.svc.cluster.local`,
              },
              className: 'nginx',
              hosts: [
                {
                  host: this.cloudflareRecordWorkstationStack.jellyfinRecord
                    .element.name,
                  paths: [
                    {
                      path: '/',
                      pathType: 'ImplementationSpecific',
                    },
                  ],
                },
              ],
            },
            persistence: {
              config: {
                existingClaim:
                  this.k8sWorkstationAppsNasStack
                    .jellyfinConfigPersistentVolumeClaim.element.metadata.name,
              },
              media: {
                existingClaim:
                  this.k8sWorkstationAppsNasStack
                    .jellyfinMediaPersistentVolumeClaim.element.metadata.name,
              },
            },
          }),
        ],
      },
      {
        serviceAccountName,
        customPodLabelKey,
        customPodLabelValue,
      },
    ];
  });

  jellyfinAuthorizationPolicy = this.provide(
    IstioAuthorizationPolicy,
    'jellyfinAuthorizationPolicy',
    id => {
      const { serviceAccountName, customPodLabelKey, customPodLabelValue } =
        this.jellyfinRelease.shared;
      return {
        manifest: {
          metadata: {
            name: `${this.k8sWorkstationAppsNasStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
            namespace:
              this.k8sWorkstationAppsNasStack.namespace.element.metadata.name,
          },
          spec: {
            selector: {
              matchLabels: {
                [customPodLabelKey]: customPodLabelValue,
              },
            },
            action: 'ALLOW' as const,
            rules: [
              {
                from: [
                  {
                    source: {
                      principals: [
                        `spiffe://cluster.local/ns/${this.k8sWorkstationAppsNasStack.namespace.element.metadata.name}/sa/${serviceAccountName}`,
                      ],
                    },
                  },
                ],
              },
              {
                from: [
                  {
                    source: {
                      namespaces: [
                        this.k8sWorkstationAppsIngressControllerStack.namespace
                          .element.metadata.name,
                      ],
                    },
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
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationAppsNasStack: K8S_Workstation_Apps_Nas_Stack,
    private readonly k8sWorkstationAppsIstioStack: K8S_Workstation_Apps_Istio_Stack,
    private readonly cloudflareRecordWorkstationStack: Cloudflare_Record_Workstation_Stack,
    private readonly k8sWorkstationAppsIngressControllerStack: K8S_Workstation_Apps_IngressController_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_NAS_Jellyfin_Stack.name,
      'Nas Jellyfin stack for workstation k8s',
    );
    this.addDependency(this.k8sWorkstationAppsIstioStack);
  }
}
