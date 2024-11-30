import path from 'path';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Workstation_Namespace_Stack } from './namespace.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { ConfigMap } from '@lib/terraform/providers/kubernetes/config-map';
import { Deployment } from '@lib/terraform/providers/kubernetes/deployment';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { Service } from '@lib/terraform/providers/kubernetes/service';
import { File } from '@lib/terraform/providers/local/file';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import { PrivateKey } from '@lib/terraform/providers/tls/private-key';
import { TlsProvider } from '@lib/terraform/providers/tls/provider';

@Injectable()
export class K8S_Workstation_SftpApp_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.k8s.workstation.sftp;

  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBakcned.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      local: this.provide(LocalProvider, 'localProvider', () => ({})),
      tls: this.provide(TlsProvider, 'tlsProvider', () => ({})),
      kubernetes: this.provide(KubernetesProvider, 'kubernetesProvider', () =>
        this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation(),
      ),
    },
  };

  meta = {
    labels: {
      app: 'sftp',
    },
    port: {
      sftp: {
        containerPort: 22,
        servicePort: 22,
        nodePort: 30001,
      },
    },
    volume: {
      sftp: {
        containerDirPath: `/home/${this.config.userName}/data`,
        hostDirPath: path.join(
          this.globalConfigService.config.terraform.stacks.k8s.workstation
            .common.volumeDirPath.hddVolume,
          'sftp-data',
        ),
        volumeName: 'sftp-data',
      },
      sftpSsd: {
        containerDirPath: `/home/${this.config.userName}/data-ssd`,
        hostDirPath: path.join(
          this.globalConfigService.config.terraform.stacks.k8s.workstation
            .common.volumeDirPath.ssdVolume,
          'sftp-data-ssd',
        ),
        volumeName: 'sftp-data-ssd',
      },
    },
  };

  sftpPrivateKey = this.provide(PrivateKey, 'sftpPrivateKey', () => ({
    algorithm: 'RSA',
    rsaBits: 4096,
  }));

  sftpPrivateKeyOpenSshFileInSecrets = this.provide(
    File,
    'sftpPrivateKeyOpenSshFileInSecrets',
    id => ({
      filename: path.join(
        process.cwd(),
        this.globalConfigService.config.terraform.stacks.common
          .generatedKeyFilesDirRelativePaths.secrets,
        K8S_Workstation_SftpApp_Stack.name,
        `${id}.key`,
      ),
      content: this.sftpPrivateKey.element.privateKeyOpenssh,
    }),
  );

  sftpPrivateKeyOpenSshFileInKeys = this.provide(
    File,
    'sftpPrivateKeyOpenSshFileInKeys',
    id => ({
      filename: path.join(
        process.cwd(),
        this.globalConfigService.config.terraform.stacks.common
          .generatedKeyFilesDirRelativePaths.keys,
        K8S_Workstation_SftpApp_Stack.name,
        `${id}.key`,
      ),
      content: this.sftpPrivateKey.element.privateKeyOpenssh,
      filePermission: '0600',
    }),
  );

  sftpConfigMap = this.provide(ConfigMap, 'sftpConfigMap', id => ({
    metadata: {
      name: _.kebabCase(id),
      namespace:
        this.k8sWorkstationNamespaceStack.personalNamespace.element.metadata
          .name,
    },
    data: {
      'ssh-public-key': this.sftpPrivateKey.element.publicKeyOpenssh,
    },
  }));

  sftpDeployment = this.provide(Deployment, 'sftpDeployment', id => ({
    metadata: {
      name: _.kebabCase(id),
      namespace:
        this.k8sWorkstationNamespaceStack.personalNamespace.element.metadata
          .name,
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
              name: 'sftp',
              image: 'atmoz/sftp',
              imagePullPolicy: 'Always',
              args: [`${this.config.userName}::1001:100:data`],
              port: [
                {
                  containerPort: this.meta.port.sftp.containerPort,
                },
              ],
              volumeMount: [
                {
                  mountPath: `/home/${this.config.userName}/.ssh/keys`,
                  name: this.sftpConfigMap.element.metadata.name,
                  readOnly: true,
                },
                {
                  name: this.meta.volume.sftp.volumeName,
                  mountPath: this.meta.volume.sftp.containerDirPath,
                },
                {
                  name: this.meta.volume.sftpSsd.volumeName,
                  mountPath: this.meta.volume.sftpSsd.containerDirPath,
                },
              ],
              securityContext: {
                capabilities: {
                  add: ['SYS_ADMIN'],
                },
              },
            },
          ],
          volume: [
            {
              name: this.sftpConfigMap.element.metadata.name,
              configMap: {
                name: this.sftpConfigMap.element.metadata.name,
              },
            },
            {
              name: this.meta.volume.sftp.volumeName,
              hostPath: {
                type: 'DirectoryOrCreate',
                path: this.meta.volume.sftp.hostDirPath,
              },
            },
            {
              name: this.meta.volume.sftpSsd.volumeName,
              hostPath: {
                type: 'DirectoryOrCreate',
                path: this.meta.volume.sftpSsd.hostDirPath,
              },
            },
          ],
        },
      },
    },
  }));

  sftpService = this.provide(Service, 'sftpService', id => ({
    metadata: {
      name: _.kebabCase(id),
      namespace:
        this.k8sWorkstationNamespaceStack.personalNamespace.element.metadata
          .name,
    },
    spec: {
      type: 'NodePort',
      selector: this.meta.labels,
      port: Object.values(this.meta.port).map(port => ({
        port: port.servicePort,
        targetPort: port.containerPort.toString(),
        nodePort: port.nodePort,
      })),
    },
  }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stack
    private readonly k8sWorkstationNamespaceStack: K8S_Workstation_Namespace_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_SftpApp_Stack.name,
      'SFTP application stack in workstation k8s',
    );
  }
}
