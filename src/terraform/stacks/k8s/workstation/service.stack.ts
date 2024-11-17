import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Workstation_Meta_Stack } from './meta.stack';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { Service } from '@lib/terraform/providers/kubernetes/service';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
@Injectable()
export class K8S_Workstation_Service_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBakcned.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      kubernetes: this.provide(KubernetesProvider, 'kubernetesProvider', () =>
        this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation(),
      ),
    },
  };

  services = this.provide(Resource, 'services', prefix => {
    const meta = this.k8sWorkstationMetaStack.meta.shared;

    const cloudbeaver = this.provide(Service, `${prefix}_cloudbeaver`, id => ({
      metadata: {
        name: _.kebabCase(id),
        namespace: meta.cloudbeaver.namespace,
      },
      spec: {
        type: 'ClusterIP',
        selector: meta.cloudbeaver.labels,
        port: Object.values(meta.cloudbeaver.port).map(port => ({
          port: port.servicePort,
          targetPort: port.containerPort.toString(),
        })),
      },
    }));

    const sftp = this.provide(Service, `${prefix}_sftp`, id => ({
      metadata: {
        name: _.kebabCase(id),
        namespace: meta.sftp.namespace,
      },
      spec: {
        type: 'ClusterIP',
        selector: meta.sftp.labels,
        port: Object.values(meta.sftp.port).map(port => ({
          port: port.servicePort,
          targetPort: port.containerPort.toString(),
        })),
      },
    }));

    return [{}, { cloudbeaver, sftp }];
  });

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    private readonly k8sWorkstationMetaStack: K8S_Workstation_Meta_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Service_Stack.name,
      'Service stack for Workstation k8s',
    );
  }
}
