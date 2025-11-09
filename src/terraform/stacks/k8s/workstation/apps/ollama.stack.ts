import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import yaml from 'yaml';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { K8S_Workstation_Apps_Istio_Stack } from './istio.stack';
import { K8S_Workstation_Apps_Longhorn_Stack } from './longhorn.stack';
import { AbstractStack, createExpirationInterval } from '@/common';
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
import { StringResource } from '@lib/terraform/providers/random/string-resource';

@Injectable()
export class K8S_Workstation_Apps_Ollama_Stack extends AbstractStack {
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
    this.k8sWorkstationSystemStack.applicationMetadata.shared.ollama,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'istio-injection': 'enabled',
      },
    },
  }));

  oauthBypassKey = this.provide(StringResource, 'argoCdBypassKey', () => ({
    length: 32,
    special: false,
    keepers: {
      expirationDate: createExpirationInterval({
        days: 30,
      }).toString(),
    },
  }));

  ollamaModelsPersistentVolumeClaim = this.provide(
    PersistentVolumeClaimV1,
    'ollamaModelsPersistentVolumeClaim',
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
            storage: '30Gi',
          },
        },
      },
      lifecycle: {
        preventDestroy: true,
      },
    }),
  );

  ollamaRelease = this.provide(Release, 'ollamaRelease', () => {
    const oauthBypassKeyName = 'X-OAuth-Bypass-Key';
    const oauthBypassKeyValue = this.oauthBypassKey.element.result;
    const domain = this.cloudflareRecordStack.ollamaRecord.element.name;
    const serviceName = 'ollama';
    const servicePort = 11434;
    return [
      {
        name: this.metadata.shared.helm.ollama.name,
        chart: this.metadata.shared.helm.ollama.chart,
        repository: this.metadata.shared.helm.ollama.repository,
        namespace: this.namespace.element.metadata.name,
        createNamespace: false,
        values: [
          yaml.stringify({
            ollama: {
              port: servicePort,
              gpu: {
                enabled: true,
              },
            },
            runtimeClassName: 'nvidia',
            persistentVolume: {
              enabled: true,
              existingClaim:
                this.ollamaModelsPersistentVolumeClaim.element.metadata.name,
            },
            /*
            ingress: {
              enabled: false,
              className: 'nginx',
              annotations: {
                'nginx.ingress.kubernetes.io/backend-protocol': 'HTTP',
                'nginx.ingress.kubernetes.io/auth-url':
                  this.k8sOkeAppsOAuth2ProxyStack.oauth2ProxyAdminRelease.shared
                    .authUrl,
                'nginx.ingress.kubernetes.io/auth-signin':
                  this.k8sOkeAppsOAuth2ProxyStack.oauth2ProxyAdminRelease.shared
                    .authSignin,
                'nginx.ingress.kubernetes.io/auth-snippet': dedent`
                  if ($http_${oauthBypassKeyName.toLowerCase().replace(/-/g, '_')} = "${oauthBypassKeyValue}") {
                      return 200;
                  }
                `,
              },
              hosts: [
                {
                  host: domain,
                  paths: [
                    {
                      path: '/',
                      pathType: 'Prefix',
                    },
                  ],
                },
              ],
            },
            */
            affinity: {
              nodeAffinity: {
                requiredDuringSchedulingIgnoredDuringExecution: {
                  nodeSelectorTerms: [
                    {
                      matchExpressions: [
                        {
                          key: 'nvidia.com/gpu.present',
                          operator: 'Exists',
                        },
                      ],
                    },
                  ],
                },
              },
            },
          }),
        ],
      },
      {
        domain,
        oauthBypassKeyHeader: {
          name: oauthBypassKeyName,
          value: oauthBypassKeyValue,
        },
        serviceName,
        servicePort,
      },
    ];
  });

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
    private readonly k8sWorkstationLonghornStack: K8S_Workstation_Apps_Longhorn_Stack,
    private readonly k8sWorkstationAppsIstioStack: K8S_Workstation_Apps_Istio_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Ollama_Stack.name,
      'Ollama stack for workstation k8s',
    );
    this.addDependency(this.k8sWorkstationAppsIstioStack);
  }
}
