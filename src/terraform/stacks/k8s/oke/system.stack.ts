import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { LocalBackend } from 'cdktf';
import { Injectable } from '@nestjs/common';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { K8S_Oke_Endpoint_Stack } from './endpoint.stack';
import { DataKubernetesNamespaceV1 } from '@lib/terraform/providers/kubernetes/data-kubernetes-namespace-v1';
import { DataKubernetesServiceV1 } from '@lib/terraform/providers/kubernetes/data-kubernetes-service-v1';

@Injectable()
export class K8S_Oke_System_Stack extends AbstractStack {
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

  dataNamespace = this.provide(DataKubernetesNamespaceV1, 'namespace', () => ({
    metadata: {
      name: 'kube-system',
    },
  }));

  dataKubernetesDashboardService = this.provide(
    DataKubernetesServiceV1,
    'dataKubernetesDashboardService',
    () => [
      {
        metadata: {
          name: 'kubernetes-dashboard',
          namespace: this.dataNamespace.element.metadata.name,
        },
      },
      {
        servicePort: 443,
      },
    ],
  );

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_System_Stack.name,
      'OKE System Stack',
    );
  }
}
