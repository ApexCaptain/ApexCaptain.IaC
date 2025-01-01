import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Namespace } from '@lib/terraform/providers/kubernetes/namespace';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import path from 'path';
import _ from 'lodash';
import { Deployment } from '@lib/terraform/providers/kubernetes/deployment';
import { Service } from '@lib/terraform/providers/kubernetes/service';
import { Cloudflare_Record_Stack } from '@/terraform/stacks/cloudflare/record.stack';

@Injectable()
export class K8S_Workstation_Apps_Palworld_Stack extends AbstractStack {
  private readonly config =
    this.globalConfigService.config.terraform.stacks.k8s.workstation.palworld;

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
    },
  };

  ssdVolumeDirPath = path.join(
    this.globalConfigService.config.terraform.stacks.k8s.workstation.common
      .volumeDirPath.ssdVolume,
    'palworld',
  );

  meta = {
    name: 'palworld',
    labels: {
      app: 'palworld',
    },
    port: {
      game: {
        containerPort: 8211,
        servicePort: 8211,
        nodePort: 31001,
        protocol: 'UDP',
      },
    },
    volume: {
      saves: {
        containerDirPath: '/opt/palworld/Pal/Saved',
        hostDirPath: path.join(this.ssdVolumeDirPath, 'saves'),
        volumeName: 'saves',
      },
      modes: {
        containerDirPath: '/opt/palworld/Pal/Content/Paks/MOD',
        hostDirPath: path.join(this.ssdVolumeDirPath, 'modes'),
        volumeName: 'modes',
      },
    },
  };

  namespace = this.provide(Namespace, 'namespace', () => ({
    metadata: {
      name: this.meta.name,
    },
  }));

  deployment = this.provide(Deployment, 'deployment', id => ({
    metadata: {
      name: _.kebabCase(`${this.meta.name}-${id}`),
      namespace: this.namespace.element.metadata.name,
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
              name: 'palworld',
              image: 'kagurazakanyaa/palworld',
              imagePullPolicy: 'Always',
              port: [this.meta.port.game].map(
                ({ containerPort, protocol }) => ({
                  containerPort,
                  protocol,
                }),
              ),
              env: [
                {
                  name: 'TZ',
                  value: 'Asia/Seoul',
                },
                {
                  name: 'MAX_PLAYERS',
                  value: '32',
                },
                {
                  name: 'GAME_PORT',
                  value: this.meta.port.game.containerPort.toString(),
                },
                {
                  name: 'ENABLE_MULTITHREAD',
                  value: 'true',
                },
                {
                  name: 'IS_PUBLIC',
                  value: 'true',
                },
                {
                  name: 'PUBLIC_IP',
                  value:
                    this.globalConfigService.config.terraform.stacks.k8s
                      .workstation.common.domain.iptime,
                },
                {
                  name: 'PUBLIC_PORT',
                  value: this.meta.port.game.nodePort.toString(),
                },
                {
                  name: 'FORCE_UPDATE',
                  value: 'true',
                },
                // 여기서부터는 수동으로 업데이트 필요
                // https://hub.docker.com/r/kagurazakanyaa/palworld
                {
                  name: 'SERVER_NAME',
                  value: 'ApexCaptain Palword Server',
                },
                {
                  name: 'SERVER_DESC',
                  value: 'ApexCaptain Palword Server',
                },
                {
                  name: 'ADMIN_PASSWORD',
                  value: this.config.adminPassword,
                },
                {
                  name: 'SERVER_PASSWORD',
                  value: this.config.serverPassword,
                },
                {
                  name: 'RCON_ENABLED',
                  value: 'true',
                },
                {
                  name: 'RCON_PORT',
                  value: '25575',
                },
                {
                  name: 'RESTAPI_ENABLED',
                  value: 'true',
                },
                {
                  name: 'RESTAPI_PORT',
                  value: '8212',
                },
              ],
              volumeMount: Object.values(this.meta.volume).map(volume => ({
                name: volume.volumeName,
                mountPath: volume.containerDirPath,
              })),
            },
          ],
          volume: Object.values(this.meta.volume).map(volume => ({
            name: volume.volumeName,
            hostPath: {
              type: 'DirectoryOrCreate',
              path: volume.hostDirPath,
            },
          })),
        },
      },
    },
  }));

  service = this.provide(Service, 'service', id => ({
    metadata: {
      name: _.kebabCase(`${this.meta.name}-${id}`),
      namespace: this.namespace.element.metadata.name,
    },
    spec: {
      type: 'NodePort',
      selector: this.meta.labels,
      port: Object.values(this.meta.port).map(port => ({
        port: port.servicePort,
        targetPort: port.containerPort.toString(),
        nodePort: port.nodePort,
        protocol: port.protocol,
      })),
    },
  }));

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Palworld_Stack.name,
      'Palworld stack for workstation k8s',
    );
  }
}
