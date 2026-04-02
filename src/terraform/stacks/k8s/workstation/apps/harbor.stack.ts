import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import yaml from 'yaml';
import { K8S_Workstation_K8S_Stack } from '../k8s.stack';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { K8S_Workstation_Apps_IngressController_Stack } from './ingress-controller.stack';
import { K8S_Workstation_Apps_Longhorn_Stack } from './longhorn.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { Cloudflare_Record_Workstation_Stack } from '@/terraform/stacks/cloudflare';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HarborProviderConfig } from '@lib/terraform/providers/harbor/provider';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Workstation_Apps_Harbor_Stack extends AbstractStack {
  config =
    this.globalConfigService.config.terraform.stacks.k8s.workstation.apps
      .harbor;

  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      helm: this.provide(HelmProvider, 'helmProvider', () => ({
        kubernetes: {
          configPath:
            this.k8sWorkstationK8SStack.kubeConfigFile.element.filename,
        },
      })),
      kubernetes: this.provide(
        KubernetesProvider,
        'kubernetesProvider',
        () => ({
          configPath:
            this.k8sWorkstationK8SStack.kubeConfigFile.element.filename,
        }),
      ),
    },
  };

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sWorkstationSystemStack.applicationMetadata.shared.harbor,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'istio-injection': 'enabled',
      },
    },
  }));

  harborAdminPasswordSecret = this.provide(
    SecretV1,
    'harborAdminPasswordSecret',
    id => {
      const passwordKey = 'password';
      return [
        {
          metadata: {
            name: `${this.namespace.element.metadata.name}-${_.kebabCase(id)}`,
            namespace: this.namespace.element.metadata.name,
          },
          data: {
            [passwordKey]: this.config.adminPassword,
          },
          type: 'Opaque',
        },
        {
          passwordKey,
        },
      ];
    },
  );

  release = this.provide(Release, 'release', () => {
    const domain =
      this.cloudflareRecordWorkstationStack.harborRecord.element.name;
    return [
      {
        name: this.metadata.shared.helm.harbor.name,
        chart: this.metadata.shared.helm.harbor.chart,
        repository: this.metadata.shared.helm.harbor.repository,
        namespace: this.namespace.element.metadata.name,
        createNamespace: false,
        values: [
          yaml.stringify({
            expose: {
              ingress: {
                hosts: {
                  core: domain,
                },
                className:
                  this.k8sWorkstationAppsIngressControllerStack.release.shared
                    .ingressClassName,
              },
            },
            externalURL: `https://${domain}`,
            persistence: {
              persistentVolumeClaim: {
                registry: {
                  storageClass:
                    this.k8sWorkstationAppsLonghornStack.longhornSsdStorageClass
                      .element.metadata.name,
                },
                jobservice: {
                  storageClass:
                    this.k8sWorkstationAppsLonghornStack.longhornSsdStorageClass
                      .element.metadata.name,
                },
                database: {
                  storageClass:
                    this.k8sWorkstationAppsLonghornStack.longhornSsdStorageClass
                      .element.metadata.name,
                },
                redis: {
                  storageClass:
                    this.k8sWorkstationAppsLonghornStack.longhornSsdStorageClass
                      .element.metadata.name,
                },
                trivy: {
                  storageClass:
                    this.k8sWorkstationAppsLonghornStack.longhornSsdStorageClass
                      .element.metadata.name,
                },
              },
            },
            existingSecretAdminPassword:
              this.harborAdminPasswordSecret.element.metadata.name,
            existingSecretAdminPasswordKey:
              this.harborAdminPasswordSecret.shared.passwordKey,
          }),
        ],
      },
      { domain },
    ];
  });

  harborProviderConfig = this.provide(Resource, 'harborProviderConfig', () => {
    const harborProviderConfig: HarborProviderConfig = {
      username: 'admin',
      password: this.config.adminPassword,
      url: `https://${this.release.shared.domain}`,
    };

    return [{}, harborProviderConfig];
  });

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationK8SStack: K8S_Workstation_K8S_Stack,
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
    private readonly k8sWorkstationAppsLonghornStack: K8S_Workstation_Apps_Longhorn_Stack,
    private readonly cloudflareRecordWorkstationStack: Cloudflare_Record_Workstation_Stack,
    private readonly k8sWorkstationAppsIngressControllerStack: K8S_Workstation_Apps_IngressController_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Harbor_Stack.name,
      'Harbor stack for workstation k8s',
    );
    this.addDependency(this.k8sWorkstationAppsIngressControllerStack);
  }
}
