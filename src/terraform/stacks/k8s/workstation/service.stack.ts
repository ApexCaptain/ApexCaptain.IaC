import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Workstation_Meta_Stack } from './meta.stack';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { Service } from '@lib/terraform/providers/kubernetes/service';

@Injectable()
export class K8S_Workstation_Service_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBakcned.secrets({
        stateId: this.id,
      }),
    ),
    providers: {
      kubernetes: this.provide(KubernetesProvider, 'kubernetesProvider', () =>
        this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation(),
      ),
    },
  };

  bytebaseService = this.provide(Service, 'bytebaseService', id => {
    const metaData = this.k8sWorkstationMetaStack.bytebaseMeta.shared;
    const labels = metaData.labels;
    return {
      metadata: {
        name: _.kebabCase(id),
      },
      spec: {
        type: 'NodePort',
        selector: labels,
        port: [
          {
            protocol: 'TCP',
            nodePort: metaData.properties.port.nodePort,
            port: metaData.properties.port.servicePort,
            targetPort: metaData.properties.port.containerPort.toString(),
          },
        ],
      },
    };
  });

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationMetaStack: K8S_Workstation_Meta_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Service_Stack.name,
      'Service stack for Workstation k8s',
    );
  }
}
