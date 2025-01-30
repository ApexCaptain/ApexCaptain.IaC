import { Injectable } from '@nestjs/common';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import _ from 'lodash';
import { LocalBackend } from 'cdktf';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { Namespace } from '@lib/terraform/providers/kubernetes/namespace';
import { Deployment } from '@lib/terraform/providers/kubernetes/deployment';

/**
 * @See https://www.honeygain.com/
 */
@Injectable()
export class K8S_Workstation_Apps_Honeygain_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.k8s.workstation.honeygain;

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
    },
  };

  meta = (() => {
    return {
      name: 'honeygain',
      labels: {
        app: 'honeygain',
      },
    };
  })();

  namespace = this.provide(Namespace, 'namespace', () => ({
    metadata: {
      name: this.meta.name,
    },
  }));

  deployment = this.provide(Deployment, 'deployment', id => ({
    metadata: {
      name: _.kebabCase(`${this.meta.name}-${id}`),
      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      replicas: '1',
      selector: {
        matchLabels: this.meta.labels,
      },
      template: {
        metadata: {
          labels: this.meta.labels,
        },
        spec: {
          container: [
            {
              name: 'honeygain',
              image: 'honeygain/honeygain',
              args: [
                '-tou-accept',
                '-email',
                this.config.email,
                '-pass',
                this.config.password,
                '-device',
                this.config.deviceName,
              ],
            },
          ],
        },
      },
    },
  }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Honeygain_Stack.name,
      'Honeygain stack for workstation k8s',
    );
  }
}
