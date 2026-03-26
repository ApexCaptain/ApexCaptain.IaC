import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import dedent from 'dedent';
import _ from 'lodash';
import yaml from 'yaml';
import { K8S_Workstation_K8S_Stack } from './k8s.stack';
import { K8S_Workstation_System_Stack } from './system.stack';
import { AbstractStack, GenericDevicePluginSetting } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { DaemonSetV1 } from '@lib/terraform/providers/kubernetes/daemon-set-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';

@Injectable()
export class K8S_Workstation_Plugin_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      kubernetes: this.provide(
        KubernetesProvider,
        'kubernetesProvider',
        () => ({
          configPath:
            this.k8sWorkstationK8SStack.kubeConfigFile.element.filename,
        }),
      ),
    },
  };

  // @See https://github.com/squat/generic-device-plugin
  genericDevicePluginDaemonSet = this.provide(
    DaemonSetV1,
    'genericDevicePluginDaemonSet',
    id => {
      const labels = {
        'app.kubernetes.io/name': 'generic-device-plugin',
      };

      const fuse: GenericDevicePluginSetting = {
        name: 'fuse',
        groups: [
          {
            count: 10,
            paths: [
              {
                path: '/dev/fuse',
              },
            ],
          },
        ],
      };

      const devices = {
        fuse,
      };

      return [
        {
          metadata: {
            name: _.kebabCase(id),
            namespace:
              this.k8sWorkstationSystemStack.dataNamespace.element.metadata
                .name,
            labels,
          },
          spec: {
            selector: {
              matchLabels: labels,
            },
            template: {
              metadata: {
                labels,
              },
              spec: {
                priorityClassName: 'system-node-critical',
                toleration: [
                  {
                    operator: 'Exists',
                    effect: 'NoExecute',
                  },
                  {
                    operator: 'Exists',
                    effect: 'NoSchedule',
                  },
                ],
                container: [
                  {
                    image: 'squat/generic-device-plugin',
                    args: Object.values(devices)
                      .map(eachDevice => [
                        '--device',
                        dedent(yaml.stringify(eachDevice)),
                      ])
                      .flat(),
                    name: 'generic-device-plugin',
                    resources: {
                      requests: {
                        cpu: '50m',
                        memory: '10Mi',
                      },
                      limits: {
                        cpu: '50m',
                        memory: '20Mi',
                      },
                    },
                    port: [
                      {
                        containerPort: 8080,
                        name: 'http',
                      },
                    ],
                    securityContext: {
                      privileged: true,
                    },
                    volumeMount: [
                      {
                        name: 'device-plugin',
                        mountPath: '/var/lib/kubelet/device-plugins',
                      },
                      {
                        name: 'dev',
                        mountPath: '/dev',
                      },
                    ],
                  },
                ],
                volume: [
                  {
                    name: 'device-plugin',
                    hostPath: {
                      path: '/var/lib/kubelet/device-plugins',
                    },
                  },
                  {
                    name: 'dev',
                    hostPath: {
                      path: '/dev',
                    },
                  },
                ],
              },
            },
            strategy: {
              type: 'RollingUpdate',
            },
          },
        },
        {
          deviceKeyPrefix: 'squat.ai',
          devices,
        },
      ];
    },
  );

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationK8SStack: K8S_Workstation_K8S_Stack,
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Plugin_Stack.name,
      'Plugin stack for workstation k8s',
    );
  }
}
