import path from 'path';
import { Injectable } from '@nestjs/common';
import { LocalBackend, Fn } from 'cdktf';
import yaml from 'yaml';
import { AbstractStack, KubeConfig } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { File } from '@lib/terraform/providers/local/file';
import { LocalProvider } from '@lib/terraform/providers/local/provider';

@Injectable()
export class K8S_Workstation_K8S_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.k8s.workstation.k8s;

  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      local: this.provide(LocalProvider, 'localProvider', () => ({})),
    },
  };

  kubeConfigFile = this.provide(File, 'kubeConfigFile', () => {
    const clusterName = 'ws';
    const contextName = clusterName;
    const userName = `${clusterName}-user`;

    const kubeConfig: KubeConfig = {
      apiVersion: 'v1',
      kind: 'Config',
      preferences: {},
      'current-context': contextName,
      clusters: [
        {
          name: clusterName,
          cluster: {
            server: this.config.server,
            'certificate-authority-data': Fn.base64encode(
              this.config.certificateAuthorityData.split('\\\n').join('\n'),
            ),
          },
        },
      ],
      contexts: [
        {
          name: contextName,
          context: {
            cluster: clusterName,
            user: userName,
          },
        },
      ],
      users: [
        {
          name: userName,
          user: {
            'client-certificate-data': Fn.base64encode(
              this.config.clientCertificateData.split('\\\n').join('\n'),
            ),
            'client-key-data': Fn.base64encode(
              this.config.clientKeyData.split('\\\n').join('\n'),
            ),
          },
        },
      ],
    };

    return [
      {
        content: yaml.stringify(kubeConfig),
        filename: path.join(
          process.cwd(),
          this.globalConfigService.config.terraform.stacks.common
            .kubeConfigDirRelativePath,
          `${this.id}.yaml`,
        ),
      },
      {
        kubeConfig,
      },
    ];
  });

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_K8S_Stack.name,
      'K8S stack for workstation k8s',
    );
  }
}
