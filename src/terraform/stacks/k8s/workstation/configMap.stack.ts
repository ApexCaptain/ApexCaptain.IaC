import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Workstation_Keys_Stack } from '.';
import { K8S_Workstation_Meta_Stack } from './meta.stack';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { ConfigMap } from '@lib/terraform/providers/kubernetes/config-map';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Workstation_ConfigMap_Stack extends AbstractStack {
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

  configMap = this.provide(Resource, 'configMap', prefix => {
    const sftp = {
      configMap: {
        sshPublicKeys: this.provide(
          ConfigMap,
          'sftpConfigMapSshPublicKeys',
          id => ({
            metadata: {
              name: _.kebabCase(id),
              namespace:
                this.k8sWorkstationMetaStack.meta.shared.sftp.namespace,
            },
            data: {
              'ssh-public-key':
                this.k8sWorkstationKeysStack.sftpServiceKey.element
                  .publicKeyOpenssh,
            },
          }),
        ),
      },
    };

    return [{}, { sftp }];
  });

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationMetaStack: K8S_Workstation_Meta_Stack,
    private readonly k8sWorkstationKeysStack: K8S_Workstation_Keys_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_ConfigMap_Stack.name,
      'ConfigMap stack for Workstation k8s',
    );
  }
}
