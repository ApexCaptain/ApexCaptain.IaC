import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import yaml from 'yaml';
import { K8S_Oke_K8S_Stack } from '../k8s.stack';
import { K8S_Oke_System_Stack } from '../system.stack';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Oke_Apps_KialiOperator_Stack extends AbstractStack {
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
    },
  };

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.kialiOperator,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'istio-injection': 'disabled',
      },
    },
  }));

  kialiOperatorRelease = this.provide(Release, 'kialiOperatorRelease', () => ({
    name: this.metadata.shared.helm.kialiOperator.name,
    chart: this.metadata.shared.helm.kialiOperator.chart,
    repository: this.metadata.shared.helm.kialiOperator.repository,
    namespace: this.namespace.element.metadata.name,
    createNamespace: false,
    values: [
      yaml.stringify({
        cr: {
          // CR 생성은 별도로 처리
          create: false,
        },
      }),
    ],
  }));

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeK8SStack: K8S_Oke_K8S_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_KialiOperator_Stack.name,
      'Kiali Operator stack for OKE k8s',
    );
  }
}
