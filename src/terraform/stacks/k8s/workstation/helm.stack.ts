import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';

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

  // ingress-nginx를 microk8s add-on으로 설치하는 것으로 변경, 별도 helm release를 설치할 필요 없음
  // 추후 다른 chart가 필요할지도 모르기때문에 비어있는 stack으로 남겨둠

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
