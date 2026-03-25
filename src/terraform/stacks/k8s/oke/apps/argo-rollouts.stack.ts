import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import yaml from 'yaml';
import { K8S_Oke_Apps_ArgoCd_Stack } from './argo-cd.stack';
import { K8S_Oke_Apps_Authentik_Stack } from './authentik.stack';
import { K8S_Oke_K8S_Stack } from '../k8s.stack';
import { K8S_Oke_System_Stack } from '../system.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { AuthentikProvider } from '@lib/terraform/providers/authentik/provider';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Oke_Apps_ArgoRollouts_Stack extends AbstractStack {
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
          configPath: this.k8sOkeK8SStack.kubeConfigFile.element.filename,
        }),
      ),
      helm: this.provide(HelmProvider, 'helmProvider', () => ({
        kubernetes: {
          configPath: this.k8sOkeK8SStack.kubeConfigFile.element.filename,
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
    this.k8sOkeSystemStack.applicationMetadata.shared.argoRollouts,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'istio-injection': 'enabled',
      },
    },
  }));

  argoRolloutsRelease = this.provide(Release, 'argoRolloutsRelease', () => {
    return {
      name: this.metadata.shared.helm.argoCdRollout.name,
      chart: this.metadata.shared.helm.argoCdRollout.chart,
      repository: this.metadata.shared.helm.argoCdRollout.repository,
      namespace: this.namespace.element.metadata.name,
      createNamespace: false,
      values: [
        yaml.stringify({
          controller: {
            resources: {
              requests: {
                cpu: '50m',
                memory: '128Mi',
              },
              limits: {
                cpu: '200m',
                memory: '256Mi',
              },
            },
            metrics: {
              enabled: false,
            },
          },
          dashboard: {
            // @Note 이건 뭐 굳이 필요 없을듯?
            enabled: false,
          },
        }),
      ],
    };
  });

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly k8sOkeK8SStack: K8S_Oke_K8S_Stack,
    private readonly k8sOkeAppsAuthentikStack: K8S_Oke_Apps_Authentik_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_ArgoRollouts_Stack.name,
      'Argo Rollouts Stack for OKE k8s',
    );
  }
}
