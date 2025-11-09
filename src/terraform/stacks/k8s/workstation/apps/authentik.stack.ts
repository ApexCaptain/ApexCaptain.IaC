import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { DataKubernetesSecretV1 } from '@lib/terraform/providers/kubernetes/data-kubernetes-secret-v1';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Workstation_Apps_Authentik_Stack extends AbstractStack {
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
    this.k8sWorkstationSystemStack.applicationMetadata.shared.authentik,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'istio-injection': 'enabled',
      },
    },
  }));

  authentikRemoteClusterRelease = this.provide(
    Release,
    'authentikRemoteClusterRelease',
    () => {
      const saSecretName = 'authentik-remote-cluster';
      return [
        {
          name: this.metadata.shared.helm['authentik-remote-cluster'].name,
          chart: this.metadata.shared.helm['authentik-remote-cluster'].chart,
          repository:
            this.metadata.shared.helm['authentik-remote-cluster'].repository,
          namespace: this.namespace.element.metadata.name,
          createNamespace: false,
        },
        {
          saSecretName,
        },
      ];
    },
  );

  dataAutentikRemoteClusterServiceAccountSecret = this.provide(
    DataKubernetesSecretV1,
    'dataAutentikRemoteClusterServiceAccountSecret',
    () => {
      return {
        metadata: {
          name: this.authentikRemoteClusterRelease.shared.saSecretName,
          namespace: this.namespace.element.metadata.name,
        },
        dependsOn: [this.authentikRemoteClusterRelease.element],
      };
    },
  );

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Authentik_Stack.name,
      'K8S Workstation Authentik Stack',
    );
  }
}
