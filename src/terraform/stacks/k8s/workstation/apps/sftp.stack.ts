import { Injectable } from '@nestjs/common';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { LocalBackend } from 'cdktf';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import path from 'path';
import { File } from '@lib/terraform/providers/local/file';
import { Resource } from '@lib/terraform/providers/null/resource';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { PrivateKey } from '@lib/terraform/providers/tls/private-key';
import { TlsProvider } from '@lib/terraform/providers/tls/provider';
import { ConfigMap } from '@lib/terraform/providers/kubernetes/config-map';
import { Namespace } from '@lib/terraform/providers/kubernetes/namespace';
import { Deployment } from '@lib/terraform/providers/kubernetes/deployment';
import { Service } from '@lib/terraform/providers/kubernetes/service';

@Injectable()
export class K8S_Workstation_Apps_Sftp_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.k8s.workstation.sftp;

  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      local: this.provide(LocalProvider, 'localProvider', () => ({})),
      tls: this.provide(TlsProvider, 'tlsProvider', () => ({})),
      kubernetes: this.provide(KubernetesProvider, 'kubernetesProvider', () =>
        this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation(),
      ),
    },
  };

  // meta = (() => {
  //   const dataDirName = 'data';
  //   return {
  //     name: 'sftp',
  //     labels: {
  //       app: 'sftp',
  //     },
  //     port: {
  //       sftp: {
  //         containerPort: 22,
  //         servicePort: 22,
  //         nodePort: 30001,
  //       },
  //     },
  //     volume: {
  //       sftp: {
  //         dataDirName,
  //         containerDirPath: `/home/${this.config.userName}/${dataDirName}`,
  //         hostDirPath: path.join(
  //           this.globalConfigService.config.terraform.stacks.k8s.workstation
  //             .common.volumeDirPath.hddVolume,
  //           'sftp-data',
  //         ),
  //         volumeName: 'sftp-data',
  //       },
  //     },
  //   };
  // })();

  // namespace = this.provide(Namespace, 'namespace', () => ({
  //   metadata: {
  //     name: this.meta.name,
  //   },
  // }));

  // privateKey = this.provide(Resource, 'privateKey', idPrefix => {
  //   const key = this.provide(PrivateKey, `${idPrefix}-key`, () => ({
  //     algorithm: 'RSA',
  //     rsaBits: 4096,
  //   }));

  //   const privateSshKeyFileInSecrets = this.provide(
  //     File,
  //     `${idPrefix}-privateSshKeyFileInSecrets`,
  //     id => ({
  //       filename: path.join(
  //         process.cwd(),
  //         this.globalConfigService.config.terraform.stacks.common
  //           .generatedKeyFilesDirRelativePaths.secrets,
  //         `${K8S_Workstation_Apps_Sftp_Stack.name}-${id}.key`,
  //       ),
  //       content: key.element.privateKeyOpenssh,
  //     }),
  //   );

  //   const privateSshKeyFileInKeys = this.provide(
  //     File,
  //     `${idPrefix}-privateSshKeyFileInKeys`,
  //     id => ({
  //       filename: path.join(
  //         process.cwd(),
  //         this.globalConfigService.config.terraform.stacks.common
  //           .generatedKeyFilesDirRelativePaths.keys,
  //         `${K8S_Workstation_Apps_Sftp_Stack.name}-${id}.key`,
  //       ),
  //       content: key.element.privateKeyOpenssh,
  //       filePermission: '0600',
  //     }),
  //   );

  //   return [
  //     {},
  //     {
  //       key,
  //       privateSshKeyFileInSecrets,
  //       privateSshKeyFileInKeys,
  //     },
  //   ];
  // });

  // configMap = this.provide(ConfigMap, 'configMap', () => ({
  //   metadata: {
  //     name: this.meta.name,
  //     namespace: this.namespace.element.metadata.name,
  //   },
  //   data: {
  //     'ssh-public-key': this.privateKey.shared.key.element.publicKeyOpenssh,
  //   },
  // }));

  // deployment = this.provide(Deployment, 'deployment', () => ({
  //   metadata: {
  //     name: this.meta.name,
  //     namespace: this.namespace.element.metadata.name,
  //   },
  //   spec: {
  //     replicas: '1',
  //     selector: {
  //       matchLabels: this.meta.labels,
  //     },
  //     template: {
  //       metadata: {
  //         labels: this.meta.labels,
  //       },
  //       spec: {
  //         container: [
  //           {
  //             name: 'sftp',
  //             image: 'atmoz/sftp',
  //             args: [
  //               `${this.config.userName}::1001:100:${this.meta.volume.sftp.dataDirName}`,
  //             ],
  //             port: [
  //               {
  //                 containerPort: this.meta.port.sftp.containerPort,
  //               },
  //             ],
  //             volumeMount: [
  //               {
  //                 mountPath: `/home/${this.config.userName}/.ssh/keys`,
  //                 name: this.configMap.element.metadata.name,
  //                 readOnly: true,
  //               },
  //               {
  //                 mountPath: this.meta.volume.sftp.containerDirPath,
  //                 name: this.meta.volume.sftp.volumeName,
  //               },
  //             ],
  //             securityContext: {
  //               capabilities: {
  //                 add: ['SYS_ADMIN'],
  //               },
  //             },
  //           },
  //         ],
  //         volume: [
  //           {
  //             name: this.configMap.element.metadata.name,
  //             configMap: {
  //               name: this.configMap.element.metadata.name,
  //             },
  //           },
  //           {
  //             name: this.meta.volume.sftp.volumeName,
  //             hostPath: {
  //               type: 'DirectoryOrCreate',
  //               path: this.meta.volume.sftp.hostDirPath,
  //             },
  //           },
  //         ],
  //       },
  //     },
  //   },
  // }));

  // service = this.provide(Service, 'service', () => ({
  //   metadata: {
  //     name: this.meta.name,
  //     namespace: this.namespace.element.metadata.name,
  //   },
  //   spec: {
  //     type: 'NodePort',
  //     selector: this.meta.labels,
  //     port: Object.values(this.meta.port).map(port => ({
  //       port: port.servicePort,
  //       targetPort: port.containerPort.toString(),
  //       nodePort: port.nodePort,
  //     })),
  //   },
  // }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Sftp_Stack.name,
      'SFTP stack for workstation k8s',
    );
  }
}
