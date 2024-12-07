import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';

@Injectable()
export class K8S_Workstation_Helm_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      helm: this.provide(HelmProvider, 'helmProvider', () =>
        this.terraformConfigService.providers.helm.ApexCaptain.workstation(),
      ),
    },
  };

  // ingressNginx = this.provide(Release, 'ingressNginx', id => ({
  //   name: _.kebabCase(id),
  //   repository: 'https://kubernetes.github.io/ingress-nginx',
  //   chart: 'ingress-nginx',
  // }));

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Helm_Stack.name,
      'Helm stack for workstation k8s',
    );
  }
}
