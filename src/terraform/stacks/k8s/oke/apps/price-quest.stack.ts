import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { K8S_Oke_K8S_Stack } from '../k8s.stack';
import { K8S_Oke_System_Stack } from '../system.stack';
import { K8S_Oke_Apps_ArgoCd_Resources_Stack } from './argo-cd.resources.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { ArgocdProvider } from '@lib/terraform/providers/argocd/provider';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Oke_Apps_PriceQuest_Stack extends AbstractStack {
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
      argoCd: this.provide(
        ArgocdProvider,
        'argoCdProvider',
        () =>
          this.argoCdResourcesStack.deployerAccountArgoCdProviderConfig.shared,
      ),
    },
  };

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sOkeSystemStack.applicationMetadata.shared.priceQuest,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'istio-injection': 'enabled',
      },
    },
  }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeK8SStack: K8S_Oke_K8S_Stack,
    private readonly k8sOkeSystemStack: K8S_Oke_System_Stack,
    private readonly argoCdResourcesStack: K8S_Oke_Apps_ArgoCd_Resources_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_PriceQuest_Stack.name,
      'K8S OKE Price Quest Stack',
    );
  }
}
