import {
  AbstractStack,
  DropOnDeathOption,
  DropOnQuitOption,
  RegionOption,
  SdtdServerConfigXmlTemplate,
} from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import {
  Cloudflare_Zone_Stack,
  Cloudflare_Record_Stack,
} from '@/terraform/stacks/cloudflare';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Workstation_Apps_Game_Stack } from './game.stack';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { ServiceV1 } from '@lib/terraform/providers/kubernetes/service-v1';
import { DeploymentV1 } from '@lib/terraform/providers/kubernetes/deployment-v1';
import { IngressV1 } from '@lib/terraform/providers/kubernetes/ingress-v1';
import Timezone from 'timezone-enum';
import { ConfigMapV1 } from '@lib/terraform/providers/kubernetes/config-map-v1';
import path from 'path';
import dedent from 'dedent';

@Injectable()
export class K8S_Workstation_Apps_Game_7dtd_Stack extends AbstractStack {
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

  sdtdService = this.provide(ServiceV1, 'sdtdService', () => {
    const selector = {
      app: 'sdtd',
    };
    return [
      {
        metadata: {
          name: this.k8sWorkstationAppsGameStack.metadata.shared.services[
            '7dtd'
          ].name,
          namespace:
            this.k8sWorkstationAppsGameStack.namespace.element.metadata.name,
        },
        spec: {
          selector,
          type: 'ClusterIP',
          port: Object.values(
            this.k8sWorkstationAppsGameStack.metadata.shared.services['7dtd']
              .ports,
          ),
        },
      },
      { selector },
    ];
  });

  sdtdServerConfigConfigMap = this.provide(
    ConfigMapV1,
    'sdtdServerConfigConfigMap',
    id => ({
      metadata: {
        name: `${this.k8sWorkstationAppsGameStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace:
          this.k8sWorkstationAppsGameStack.namespace.element.metadata.name,
      },
      data: {
        'sdtdserver.xml': new SdtdServerConfigXmlTemplate().render({
          // Server representation
          ServerName: 'ApexCaptain 7dtd Server',
          ServerDescription: 'ApexCaptain 7dtd Server',
          ServerWebsiteURL: `https://${this.cloudflareRecordStack.sdtdRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
          ServerPassword:
            this.k8sWorkstationAppsGameStack.config.sdtd.settings
              .serverPassword,
          ServerLoginConfirmationText: 'ApexCaptain 7dtd Server',
          Region: RegionOption.Asia,
          Language: 'Korean',

          // Networking
          ServerDisabledNetworkProtocols: 'LiteNetLib',

          // Admin interfaces
          WebDashboardEnabled: true,
          WebDashboardUrl: `https://${this.cloudflareRecordStack.sdtdRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
          EnableMapRendering: true,
          TelnetEnabled: false,
          TerminalWindowEnabled: false,

          // Game Rules
          DropOnDeath: DropOnDeathOption.Nothing,
          DropOnQuit: DropOnQuitOption.Nothing,
        }),
      },
    }),
  );

  sdtdDeployment = this.provide(DeploymentV1, 'sdtdDeployment', id => {
    const configMapFilesContainerDirPath = '/tmp/config-maps';

    return {
      metadata: {
        name: `${this.k8sWorkstationAppsGameStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace:
          this.k8sWorkstationAppsGameStack.namespace.element.metadata.name,
      },
      spec: {
        replicas: '1',
        selector: {
          matchLabels: this.sdtdService.shared.selector,
        },
        template: {
          metadata: {
            labels: this.sdtdService.shared.selector,
          },
          spec: {
            container: [
              {
                name: this.k8sWorkstationAppsGameStack.metadata.shared.services[
                  '7dtd'
                ].name,
                image: 'vinanrra/7dtd-server:v0.9.2',
                imagePullPolicy: 'Always',
                port: [
                  {
                    containerPort:
                      this.k8sWorkstationAppsGameStack.metadata.shared.services[
                        '7dtd'
                      ].ports.dashboard.port,
                    protocol:
                      this.k8sWorkstationAppsGameStack.metadata.shared.services[
                        '7dtd'
                      ].ports.dashboard.protocol,
                  },
                  {
                    containerPort:
                      this.k8sWorkstationAppsGameStack.metadata.shared.services[
                        '7dtd'
                      ].ports.tcpGamePort1.port,
                    protocol:
                      this.k8sWorkstationAppsGameStack.metadata.shared.services[
                        '7dtd'
                      ].ports.tcpGamePort1.protocol,
                  },
                  {
                    containerPort:
                      this.k8sWorkstationAppsGameStack.metadata.shared.services[
                        '7dtd'
                      ].ports.udpGamePort1.port,
                    protocol:
                      this.k8sWorkstationAppsGameStack.metadata.shared.services[
                        '7dtd'
                      ].ports.udpGamePort1.protocol,
                  },
                  {
                    containerPort:
                      this.k8sWorkstationAppsGameStack.metadata.shared.services[
                        '7dtd'
                      ].ports.udpGamePort2.port,
                    protocol:
                      this.k8sWorkstationAppsGameStack.metadata.shared.services[
                        '7dtd'
                      ].ports.udpGamePort2.protocol,
                  },
                  {
                    containerPort:
                      this.k8sWorkstationAppsGameStack.metadata.shared.services[
                        '7dtd'
                      ].ports.udpGamePort3.port,
                    protocol:
                      this.k8sWorkstationAppsGameStack.metadata.shared.services[
                        '7dtd'
                      ].ports.udpGamePort3.protocol,
                  },
                ],
                volumeMount: [
                  {
                    name: this.sdtdServerConfigConfigMap.element.metadata.name,
                    mountPath: path.join(
                      configMapFilesContainerDirPath,
                      'sdtdserver.xml',
                    ),
                    subPath: 'sdtdserver.xml',
                  },
                  {
                    name: this.k8sWorkstationAppsGameStack
                      .sdtdSavesPersistentVolumeClaim.element.metadata.name,
                    mountPath: '/home/sdtdserver/.local/share/7DaysToDie',
                  },
                  {
                    name: this.k8sWorkstationAppsGameStack
                      .sdtdBackupsPersistentVolumeClaim.element.metadata.name,
                    mountPath: '/home/sdtdserver/lgsm/backup',
                  },
                  {
                    name: this.k8sWorkstationAppsGameStack
                      .sdtdLgsmConfigPersistentVolumeClaim.element.metadata
                      .name,
                    mountPath: '/home/sdtdserver/lgsm/config-lgsm/sdtdserver',
                  },
                  {
                    name: this.k8sWorkstationAppsGameStack
                      .sdtdLogsPersistentVolumeClaim.element.metadata.name,
                    mountPath: '/home/sdtdserver/log',
                  },
                  {
                    name: this.k8sWorkstationAppsGameStack
                      .sdtdServerConfigPersistentVolumeClaim.element.metadata
                      .name,
                    mountPath: '/home/sdtdserver/serverfiles',
                  },
                ],
                env: [
                  // General
                  {
                    name: 'TimeZone',
                    value: Timezone['Asia/Seoul'],
                  },
                  // LinuxGSM
                  {
                    name: 'BACKUP',
                    value: 'YES',
                  },
                  {
                    name: 'BACKUP_HOUR',
                    value: '5',
                  },
                  {
                    name: 'BACKUP_MAX',
                    value: '7',
                  },
                  // Mods
                  {
                    name: 'UPDATE_MODS',
                    value: 'YES',
                  },
                  {
                    name: 'MODS_URLS',
                    value: '',
                  },
                  {
                    name: 'UNDEAD_LEGACY',
                    value: 'NO',
                  },
                  {
                    name: 'DARKNESS_FALLS',
                    value: 'NO',
                  },
                  {
                    name: 'ALLOC_FIXES',
                    value: 'NO',
                  },
                  {
                    name: 'ALLOC_FIXES_UPDATE',
                    value: 'NO',
                  },
                  {
                    name: 'CPM',
                    value: 'NO',
                  },
                  {
                    name: 'CPM_UPDATE',
                    value: 'NO',
                  },
                  {
                    name: 'BEPINEX',
                    value: 'NO',
                  },
                  {
                    name: 'BEPINEX_UPDATE',
                    value: 'NO',
                  },
                  // Start Modes
                  {
                    name: 'START_MODE',
                    value: '3',
                  },
                ],
                lifecycle: {
                  postStart: [
                    {
                      exec: {
                        command: [
                          '/bin/sh',
                          '-c',
                          dedent`
                            cp ${configMapFilesContainerDirPath}/sdtdserver.xml /home/sdtdserver/serverfiles/sdtdserver.xml
                          `,
                        ],
                      },
                    },
                  ],
                },
              },
            ],
            volume: [
              {
                name: this.sdtdServerConfigConfigMap.element.metadata.name,
                configMap: {
                  items: [
                    {
                      key: 'sdtdserver.xml',
                      path: 'sdtdserver.xml',
                    },
                  ],
                  name: this.sdtdServerConfigConfigMap.element.metadata.name,
                },
              },
              {
                name: this.k8sWorkstationAppsGameStack
                  .sdtdSavesPersistentVolumeClaim.element.metadata.name,
                persistentVolumeClaim: {
                  claimName:
                    this.k8sWorkstationAppsGameStack
                      .sdtdSavesPersistentVolumeClaim.element.metadata.name,
                },
              },
              {
                name: this.k8sWorkstationAppsGameStack
                  .sdtdBackupsPersistentVolumeClaim.element.metadata.name,
                persistentVolumeClaim: {
                  claimName:
                    this.k8sWorkstationAppsGameStack
                      .sdtdBackupsPersistentVolumeClaim.element.metadata.name,
                },
              },
              {
                name: this.k8sWorkstationAppsGameStack
                  .sdtdLgsmConfigPersistentVolumeClaim.element.metadata.name,
                persistentVolumeClaim: {
                  claimName:
                    this.k8sWorkstationAppsGameStack
                      .sdtdLgsmConfigPersistentVolumeClaim.element.metadata
                      .name,
                },
              },
              {
                name: this.k8sWorkstationAppsGameStack
                  .sdtdLogsPersistentVolumeClaim.element.metadata.name,
                persistentVolumeClaim: {
                  claimName:
                    this.k8sWorkstationAppsGameStack
                      .sdtdLogsPersistentVolumeClaim.element.metadata.name,
                },
              },
              {
                name: this.k8sWorkstationAppsGameStack
                  .sdtdServerConfigPersistentVolumeClaim.element.metadata.name,
                persistentVolumeClaim: {
                  claimName:
                    this.k8sWorkstationAppsGameStack
                      .sdtdServerConfigPersistentVolumeClaim.element.metadata
                      .name,
                },
              },
            ],
          },
        },
      },
      lifecycle: {
        replaceTriggeredBy: [
          `${this.sdtdServerConfigConfigMap.element.terraformResourceType}.${this.sdtdServerConfigConfigMap.element.friendlyUniqueId}`,
        ],
      },
    };
  });

  sdtdDashboardIngress = this.provide(
    IngressV1,
    'sdtdDashboardIngress',
    id => ({
      metadata: {
        name: `${this.k8sWorkstationAppsGameStack.namespace.element.metadata.name}-${_.kebabCase(id)}`,
        namespace:
          this.k8sWorkstationAppsGameStack.namespace.element.metadata.name,
        annotations: {},
      },
      spec: {
        ingressClassName: 'nginx',
        rule: [
          {
            host: `${this.cloudflareRecordStack.sdtdRecord.element.name}.${this.cloudflareZoneStack.dataAyteneve93Zone.element.name}`,
            http: {
              path: [
                {
                  path: '/',
                  pathType: 'Prefix',
                  backend: {
                    service: {
                      name: this.sdtdService.element.metadata.name,
                      port: {
                        number:
                          this.k8sWorkstationAppsGameStack.metadata.shared
                            .services['7dtd'].ports.dashboard.port,
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    }),
  );

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationAppsGameStack: K8S_Workstation_Apps_Game_Stack,
    private readonly cloudflareZoneStack: Cloudflare_Zone_Stack,
    private readonly cloudflareRecordStack: Cloudflare_Record_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Game_7dtd_Stack.name,
      'Game 7dtd stack for workstation k8s',
    );
  }
}
