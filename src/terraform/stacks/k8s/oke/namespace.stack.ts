import { Injectable } from '@nestjs/common';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { LocalBackend } from 'cdktf';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { Namespace } from '@lib/terraform/providers/kubernetes/namespace';
import _ from 'lodash';
import { Oci_Oke_Stack } from '../../oci/oke.stack';
import { Oci_Bastion_Stack } from '../../oci/bastion.stack';

@Injectable()
export class K8S_Oke_Namespace_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),

    // ssh -i <privateKey> -N -D 127.0.0.1:<localPort> -p 22 ocid1.bastionsession.oc1.ap-chuncheon-1.amaaaaaau24mzhaae3kuknmk7woqovhuhju2qmdtivajnl2rmyxtlo7arrda@host.bastion.ap-chuncheon-1.oci.oraclecloud.com
    providers: {
      kubernetes: this.provide(
        KubernetesProvider,
        'kubernetesProvider',
        () => ({
          configPath:
            this.ociOkeStack.okeKubeConfig.shared.kubeConfigFile.element
              .filename,
          insecure: true,
          exec: [
            {
              apiVersion: 'client.authentication.k8s.io/v1beta1',
              command: 'ssh',
              args: [
                '-o',
                'StrictHostKeyChecking=no',
                '-i',
                this.ociBastionStack.okeBastionSshKey.shared
                  .privateSshKeyFileInKeys.element.filename,
                '-N',
                '-D',
                '46443',
                '-p',
                '22',
                `${this.ociBastionStack.okeBastionSession.element.id}@host.bastion.ap-chuncheon-1.oci.oraclecloud.com`,
              ],
            },
          ],
          proxyUrl: 'socks5://localhost:46443',
        }),
      ),
    },
  };

  testNamespace = this.provide(Namespace, 'testNamespace', id => ({
    metadata: {
      name: _.kebabCase(id),
    },
  }));

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly ociOkeStack: Oci_Oke_Stack,
    private readonly ociBastionStack: Oci_Bastion_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Namespace_Stack.name,
      'Namespace stack for oke k8s',
    );
  }
}
