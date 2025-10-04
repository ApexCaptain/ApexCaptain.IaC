import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Injectable } from '@nestjs/common';
import { K8S_Oke_Endpoint_Stack } from '../endpoint.stack';
import { K8S_Oke_Apps_ArgoCd_Stack } from './argo-cd.stack';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { LocalBackend } from 'cdktf';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import { DefaultServiceAccountV1 } from '@lib/terraform/providers/kubernetes/default-service-account-v1';
import { Resource } from '@lib/terraform/providers/null/resource';
import _ from 'lodash';

@Injectable()
export class K8S_Oke_Apps_GitOps_Stack extends AbstractStack {
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
          proxyUrl:
            this.k8sOkeEndpointStack.okeEndpointSource.shared.proxyUrl.socks5,
          configPath:
            this.k8sOkeEndpointStack.okeEndpointSource.shared
              .kubeConfigFilePath,
        }),
      ),
    },
  };

  numberPlanet = this.provide(Resource, 'numberPlanet', idPrefix => {
    const namespace = this.provide(
      NamespaceV1,
      `${idPrefix}-namespace`,
      id => ({
        metadata: {
          name: _.kebabCase(id),
          labels: {
            'istio-injection': 'enabled',
          },
        },
      }),
    );

    const imagePullSecret = this.provide(
      SecretV1,
      `${idPrefix}-imagePullSecret`,
      id => ({
        metadata: {
          name: _.kebabCase(id),
          namespace: namespace.element.metadata.name,
        },
        data: this.k8sOkeAppsArgoCdStack.apexCaptainOcirRegistryImagePullSecret
          .element.data,
        type: this.k8sOkeAppsArgoCdStack.apexCaptainOcirRegistryImagePullSecret
          .element.type,
      }),
    );

    this.provide(
      DefaultServiceAccountV1,
      `${idPrefix}-defaultServiceAccount`,
      () => ({
        metadata: {
          namespace: namespace.element.metadata.name,
        },
        imagePullSecret: [{ name: imagePullSecret.element.metadata.name }],
      }),
    );

    return [{}, { namespace }];
  });

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
    private readonly globalConfigService: GlobalConfigService,

    // Stacks
    private readonly k8sOkeAppsArgoCdStack: K8S_Oke_Apps_ArgoCd_Stack,
    private readonly k8sOkeEndpointStack: K8S_Oke_Endpoint_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Apps_GitOps_Stack.name,
      'K8S OKE GitOps Stack',
    );
  }
}
