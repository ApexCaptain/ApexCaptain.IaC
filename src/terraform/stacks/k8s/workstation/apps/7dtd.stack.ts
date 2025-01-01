import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Deployment } from '@lib/terraform/providers/kubernetes/deployment';
import { Namespace } from '@lib/terraform/providers/kubernetes/namespace';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import path from 'path';

@Injectable()
export class K8S_Workstation_Apps_7dtd_Stack extends AbstractStack {
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
      local: this.provide(LocalProvider, 'localProvider', () => ({})),
    },
  };

  ssdVolumeDirPath = path.join(
    this.globalConfigService.config.terraform.stacks.k8s.workstation.common
      .volumeDirPath.ssdVolume,
    '7dtd',
  );

  meta = {
    name: '7dtd',
    labels: {
      app: '7dtd',
    },
    port: {
      webAdmin: {
        containerPort: 8080,
        servicePort: 8080,
        protocol: 'TCP',
      },
      game: {
        defaultTcpGamePort: {
          containerPort: 26900,
          servicePort: 26900,
          nodePort: 30900,
          protocol: 'TCP',
        },
        defaultUdpGamePort1: {
          containerPort: 26900,
          servicePort: 26900,
          nodePort: 30900,
          protocol: 'UDP',
        },
        defaultUdpGamePort2: {
          containerPort: 26901,
          servicePort: 26901,
          nodePort: 30901,
          protocol: 'UDP',
        },
        defaultUdpGamePort3: {
          containerPort: 26902,
          servicePort: 26902,
          nodePort: 30902,
          protocol: 'UDP',
        },
      },
    },
    volume: {
      saves: {
        containerDirPath: '/home/sdtdserver/.local/share/7DaysToDie/',
        hostDirPath: path.join(this.ssdVolumeDirPath, 'saves'),
        volumeName: 'saves',
      },
      lgsmConfig: {
        containerDirPath: '/home/sdtdserver/lgsm/config-lgsm/sdtdserver',
        hostDirPath: path.join(this.ssdVolumeDirPath, 'lgsm-config'),
        volumeName: 'lgsm-config',
      },
      serverFiles: {
        containerDirPath: '/home/sdtdserver/serverfiles/',
        hostDirPath: path.join(this.ssdVolumeDirPath, 'serverfiles'),
        volumeName: 'serverfiles',
      },
      logs: {
        containerDirPath: '/home/sdtdserver/log/',
        hostDirPath: path.join(this.ssdVolumeDirPath, 'logs'),
        volumeName: 'logs',
      },
      backups: {
        containerDirPath: '/home/sdtdserver/lgsm/backup/',
        hostDirPath: path.join(this.ssdVolumeDirPath, 'backups'),
        volumeName: 'backups',
      },
    },
  };

  namespace = this.provide(Namespace, 'namespace', () => ({
    metadata: {
      name: this.meta.name,
    },
  }));

  // deployment = this.provide(Deployment, 'deployment', id => ({
  //   metadata: {
  //     name: _.kebabCase(`${this.meta.name}-${id}`),
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
  //             name: '7dtd',
  //             image: 'vinanrra/7dtd-server',
  //             imagePullPolicy: 'Always',
  //             port: [
  //               this.meta.port.webAdmin,
  //               ...Object.values(this.meta.port.game),
  //             ].map(each => ({
  //               containerPort: each.containerPort,
  //               protocol: each.protocol,
  //             })),
  //             volumeMount: Object.values(this.meta.volume).map(each => ({
  //               name: each.volumeName,
  //               mountPath: each.containerDirPath,
  //             })),
  //           },
  //         ],
  //         volume: Object.values(this.meta.volume).map(each => ({
  //           name: each.volumeName,
  //           hostPath: {
  //             type: 'DirectoryOrCreate',
  //             path: each.hostDirPath,
  //           },
  //         })),
  //       },
  //     },
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
      K8S_Workstation_Apps_7dtd_Stack.name,
      '7dtd stack for workstation k8s',
    );
  }
}
