import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import dedent from 'dedent';
import _ from 'lodash';
import yaml from 'yaml';
import { K8S_Workstation_K8S_Stack } from '../k8s.stack';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { DaemonSetV1 } from '@lib/terraform/providers/kubernetes/daemon-set-v1';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Workstation_Apps_Lxcfs_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      kubernetes: this.provide(
        KubernetesProvider,
        'kubernetesProvider',
        () => ({
          configPath:
            this.k8sWorkstationK8SStack.kubeConfigFile.element.filename,
        }),
      ),
      helm: this.provide(HelmProvider, 'helmProvider', () => ({
        kubernetes: {
          configPath:
            this.k8sWorkstationK8SStack.kubeConfigFile.element.filename,
        },
      })),
    },
  };

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sWorkstationSystemStack.applicationMetadata.shared.lxcfs,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
    },
  }));

  release = this.provide(Release, 'release', () => {
    const lxcfsHostMountPath = '/var/lib/lxcfs-on-k8s/lxcfs';
    return [
      {
        name: this.metadata.shared.helm.lxcfs.name,
        chart: this.metadata.shared.helm.lxcfs.chart,
        repository: this.metadata.shared.helm.lxcfs.repository,
        namespace: this.namespace.element.metadata.name,
        createNamespace: false,
        values: [
          yaml.stringify({
            lxcfs: {
              mountPath: lxcfsHostMountPath,
            },
          }),
        ],
      },
      { lxcfsHostMountPath },
    ];
  });

  lxcfsMountRecoveryDaemonSet = this.provide(
    DaemonSetV1,
    'lxcfsMountRecoveryDaemonSet',
    id => {
      const labels = {
        'app.kubernetes.io/name': 'lxcfs-mount-recovery',
      };
      const intervalSeconds = 60;
      return {
        metadata: {
          name: _.kebabCase(id),
          namespace: this.namespace.element.metadata.name,
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
              hostPid: true,
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
                  name: 'mount-recovery',
                  image: 'alpine',
                  command: ['/bin/sh', '-c'],

                  args: [
                    dedent`
                      while true; do
                        OUT=$(nsenter -t 1 -m -- stat "$MOUNT_PATH" 2>&1 || true)
                        if echo "$OUT" | grep -qiE 'transport endpoint|not connected|stale'; then
                          echo "$(date +%Y-%m-%dT%H:%M:%SZ) broken lxcfs mount at $MOUNT, lazy unmount" >&2
                          nsenter -t 1 -m -- umount -l "$MOUNT_PATH" 2>/dev/null || true
                        fi
                        sleep "$INTERVAL"
                      done
                    `,
                  ],
                  securityContext: {
                    privileged: true,
                  },
                  env: [
                    {
                      name: 'INTERVAL',
                      value: intervalSeconds.toString(),
                    },
                    {
                      name: 'MOUNT_PATH',
                      value: this.release.shared.lxcfsHostMountPath,
                    },
                  ],
                  resources: {
                    requests: {
                      cpu: '10m',
                      memory: '32Mi',
                    },
                    limits: {
                      cpu: '100m',
                      memory: '64Mi',
                    },
                  },
                },
              ],
            },
          },
          strategy: {
            type: 'RollingUpdate',
          },
        },
        dependsOn: [this.release.element],
      };
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
      K8S_Workstation_Apps_Lxcfs_Stack.name,
      'Lxcfs stack for workstation k8s',
    );
  }
}
