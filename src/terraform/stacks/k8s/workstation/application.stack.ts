import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Workstation_ConfigMap_Stack } from '.';
import { K8S_Workstation_Meta_Stack } from './meta.stack';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Deployment } from '@lib/terraform/providers/kubernetes/deployment';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';

@Injectable()
export class K8S_Workstation_Application_Stack extends AbstractStack {
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

  deployments = this.provide(Resource, 'deployments', prefix => {
    const meta = this.k8sWorkstationMetaStack.meta.shared;

    const cloudbeaver = this.provide(
      Deployment,
      `${prefix}_cloudbeaver`,
      id => ({
        metadata: {
          name: _.kebabCase(id),
          namespace: meta.cloudbeaver.namespace,
        },
        spec: {
          replicas: '1',
          selector: {
            matchLabels: meta.cloudbeaver.labels,
          },
          template: {
            metadata: {
              labels: meta.cloudbeaver.labels,
            },
            spec: {
              container: [
                {
                  name: 'cloudbeaver',
                  // @Note: This is not the latest version of CloudBeaver but
                  // it is the latest version that is compatible with current k8s cluster. idk why.
                  image: 'dbeaver/cloudbeaver:24.2.0',
                  imagePullPolicy: 'Always',
                  port: [
                    {
                      containerPort:
                        meta.cloudbeaver.port.workspace.containerPort,
                    },
                  ],
                  livenessProbe: {
                    httpGet: {
                      path: '/',
                      port: meta.cloudbeaver.port.workspace.containerPort.toString(),
                    },
                    initialDelaySeconds: 300,
                    periodSeconds: 300,
                    timeoutSeconds: 10,
                  },

                  volumeMount: [
                    {
                      name: meta.cloudbeaver.volume.workspace.volumeName,
                      mountPath:
                        meta.cloudbeaver.volume.workspace.containerDirPath,
                    },
                  ],
                },
              ],
              volume: [
                {
                  name: meta.cloudbeaver.volume.workspace.volumeName,
                  hostPath: {
                    type: 'DirectoryOrCreate',
                    path: meta.cloudbeaver.volume.workspace.hostDirPath,
                  },
                },
              ],
            },
          },
        },
      }),
    );

    const sftp = this.provide(Deployment, `${prefix}_sftp`, id => ({
      metadata: {
        name: _.kebabCase(id),
        namespace: meta.sftp.namespace,
      },
      spec: {
        replicas: '1',
        selector: {
          matchLabels: meta.sftp.labels,
        },
        template: {
          metadata: {
            labels: meta.sftp.labels,
          },
          spec: {
            container: [
              {
                name: 'sftp',
                image: 'atmoz/sftp:latest',
                imagePullPolicy: 'Always',
                args: [
                  `${meta.sftp.secrets.userName}::1001:100:incoming,outgoing`,
                ],
                ports: [
                  {
                    containerPort: meta.sftp.port.sftp.containerPort,
                  },
                ],
                volumeMount: [
                  {
                    mountPath: `/home/${meta.sftp.secrets.userName}/.ssh/keys`,
                    name: this.k8sWorkstationConfigMapStack.configMap.shared
                      .sftp.configMap.sshPublicKeys.element.metadata.name,
                    readOnly: true,
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
                name: this.k8sWorkstationConfigMapStack.configMap.shared.sftp
                  .configMap.sshPublicKeys.element.metadata.name,
                configMap: {
                  name: this.k8sWorkstationConfigMapStack.configMap.shared.sftp
                    .configMap.sshPublicKeys.element.metadata.name,
                },
              },
            ],
          },
        },
      },
    }));

    return [{}, { cloudbeaver, sftp }];
  });

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationMetaStack: K8S_Workstation_Meta_Stack,
    private readonly k8sWorkstationConfigMapStack: K8S_Workstation_ConfigMap_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Application_Stack.name,
      'Application stack for Workstation k8s',
    );
  }
}
