import path from 'path';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Workstation_Namespace_Stack } from './namespace.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { Deployment } from '@lib/terraform/providers/kubernetes/deployment';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { Service } from '@lib/terraform/providers/kubernetes/service';

@Injectable()
export class K8S_Workstation_CloudbeaverApp_Stack extends AbstractStack {
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
  meta = {
    namespace: this.k8sWorkstationNamespaceStack.utilityNamespace,
    labels: {
      app: 'cloudbeaver',
    },
    port: {
      workspace: {
        containerPort: 8978,
        servicePort: 8978,
      },
    },
    volume: {
      workspace: {
        containerDirPath: '/opt/cloudbeaver/workspace',
        hostDirPath: path.join(
          this.globalConfigService.config.terraform.stacks.k8s.workstation
            .common.volumeDirPath.ssdVolume,
          'cloudbeaver-workspace',
        ),
        volumeName: 'cloudbeaver-workspace',
      },
    },
  };

  cloudbeaverDeployment = this.provide(
    Deployment,
    'cloudbeaverDeployment',
    id => ({
      metadata: {
        name: _.kebabCase(id),
        namespace: this.meta.namespace.element.metadata.name,
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
                name: 'cloudbeaver',
                // @Note: This is not the latest version of CloudBeaver but
                // it is the latest version that is compatible with current k8s cluster. idk why.
                image: 'dbeaver/cloudbeaver:24.2.0',
                imagePullPolicy: 'Always',
                port: [
                  {
                    containerPort: this.meta.port.workspace.containerPort,
                  },
                ],
                livenessProbe: {
                  httpGet: {
                    path: '/',
                    port: this.meta.port.workspace.containerPort.toString(),
                  },
                  initialDelaySeconds: 300,
                  periodSeconds: 300,
                  timeoutSeconds: 10,
                },

                volumeMount: [
                  {
                    name: this.meta.volume.workspace.volumeName,
                    mountPath: this.meta.volume.workspace.containerDirPath,
                  },
                ],
              },
            ],
            volume: [
              {
                name: this.meta.volume.workspace.volumeName,
                hostPath: {
                  type: 'DirectoryOrCreate',
                  path: this.meta.volume.workspace.hostDirPath,
                },
              },
            ],
          },
        },
      },
    }),
  );

  cloudbeaverService = this.provide(Service, 'cloudbeaverService', id => ({
    metadata: {
      name: _.kebabCase(id),
      namespace: this.meta.namespace.element.metadata.name,
    },
    spec: {
      type: 'ClusterIP',
      selector: this.meta.labels,
      port: Object.values(this.meta.port).map(port => ({
        port: port.servicePort,
        targetPort: port.containerPort.toString(),
      })),
    },
  }));

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
    // Global
    private readonly globalConfigService: GlobalConfigService,
    // Stacks
    private readonly k8sWorkstationNamespaceStack: K8S_Workstation_Namespace_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_CloudbeaverApp_Stack.name,
      'Cloudbeaver application stack in workstation k8s',
    );
  }
}
