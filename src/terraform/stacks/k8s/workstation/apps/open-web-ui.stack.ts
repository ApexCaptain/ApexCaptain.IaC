import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import yaml from 'yaml';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { K8S_Workstation_Apps_Istio_Stack } from './istio.stack';
import { K8S_Workstation_Apps_Longhorn_Stack } from './longhorn.stack';
import { K8S_Workstation_Apps_Ollama_Stack } from './ollama.stack';
import { AbstractStack } from '@/common';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { PersistentVolumeClaimV1 } from '@lib/terraform/providers/kubernetes/persistent-volume-claim-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { RandomProvider } from '@lib/terraform/providers/random/provider';

@Injectable()
export class K8S_Workstation_Apps_OpenWebUi_Stack extends AbstractStack {
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
      random: this.provide(RandomProvider, 'randomProvider', () => ({})),
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
    this.k8sWorkstationSystemStack.applicationMetadata.shared.openWebUi,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'istio-injection': 'enabled',
      },
    },
  }));

  openWebUiPersistentVolumeClaim = this.provide(
    PersistentVolumeClaimV1,
    'openWebUiPersistentVolumeClaim',
    id => ({
      metadata: {
        name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace: this.namespace.element.metadata.name,
      },
      spec: {
        storageClass:
          this.k8sWorkstationLonghornStack.longhornSsdStorageClass.element
            .metadata.name,
        accessModes: ['ReadWriteOnce'],
        resources: {
          requests: {
            storage: '2Gi',
          },
        },
      },
      lifecycle: {
        preventDestroy: true,
      },
    }),
  );

  openWebUiRelease = this.provide(Release, 'openWebUiRelease', () => {
    const ollamaRelease = this.k8sWorkstationAppsOllamaStack.ollamaRelease;

    return {
      name: this.metadata.shared.helm.openWebui.name,
      chart: this.metadata.shared.helm.openWebui.chart,
      repository: this.metadata.shared.helm.openWebui.repository,
      namespace: this.namespace.element.metadata.name,
      createNamespace: false,
      values: [
        yaml.stringify({
          // Ollama
          ollama: {
            enabled: false,
          },
          ollamaUrls: [
            `http://${ollamaRelease.shared.serviceName}.${this.k8sWorkstationAppsOllamaStack.namespace.element.metadata.name}:${ollamaRelease.shared.servicePort}`,
          ],

          tika: {
            enabled: true,
          },
          livenessProbe: {
            httpGet: {
              path: '/health',
              port: 'http',
            },
            failureThreshold: 1,
            periodSeconds: 10,
          },
          readinessProbe: {
            httpGet: {
              path: '/health/db',
              port: 'http',
            },
            failureThreshold: 1,
            periodSeconds: 10,
          },
          startupProbe: {
            httpGet: {
              path: '/health',
              port: 'http',
            },
            failureThreshold: 20,
            periodSeconds: 5,
            initialDelaySeconds: 30,
          },
          /*
          ingress: {
            enabled: false,
            class: 'nginx',
            annotations: {
              'nginx.ingress.kubernetes.io/backend-protocol': 'HTTP',
              'nginx.ingress.kubernetes.io/rewrite-target': '/',
              'nginx.ingress.kubernetes.io/auth-url':
                this.k8sOkeAppsOAuth2ProxyStack.oauth2ProxyAdminRelease.shared
                  .authUrl,
            },
            host: this.cloudflareRecordStack.aiRecord.element.name,
          },
          */

          // SSO
          // @ToDo 추후 OIDC 연동해야 함, Ingress oauth2 proxy는 제거
          sso: {
            enabled: false,
          },

          // Persistence
          persistence: {
            existingClaim:
              this.openWebUiPersistentVolumeClaim.element.metadata.name,
          },
        }),
      ],
    };
  });

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
    private readonly k8sWorkstationLonghornStack: K8S_Workstation_Apps_Longhorn_Stack,
    private readonly k8sWorkstationAppsIstioStack: K8S_Workstation_Apps_Istio_Stack,
    private readonly k8sWorkstationAppsOllamaStack: K8S_Workstation_Apps_Ollama_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_OpenWebUi_Stack.name,
      'Open Web UI stack for workstation k8s',
    );
    this.addDependency(this.k8sWorkstationAppsIstioStack);
    this.addDependency(this.k8sWorkstationAppsOllamaStack);
  }
}
