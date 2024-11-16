import { meta } from '@hapi/joi';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Workstation_Meta_Stack } from './meta.stack';
import { K8S_Workstation_Service_Stack } from './service.stack';
import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { StatefulSet } from '@lib/terraform/providers/kubernetes/stateful-set';
@Injectable()
export class K8S_Workstation_StatefulSet_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBakcned.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      kubernetes: this.provide(KubernetesProvider, 'kubernetesProvider', () =>
        this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation(),
      ),
    },
  };

  cloudbeaverStatefulSet = this.provide(
    StatefulSet,
    'cloudbeaverStatefulSet',
    id => {
      const metaData = this.k8sWorkstationMetaStack.cloudbeaverMeta.shared;
      const labels = metaData.labels;
      return {
        metadata: {
          name: _.kebabCase(id),
        },
        spec: {
          serviceName:
            this.k8sWorkstationServiceStack.cloudbeaverService.element.metadata
              .name,
          replicas: '1',
          selector: {
            matchLabels: labels,
          },
          template: {
            metadata: {
              labels,
            },
            spec: {
              container: [
                {
                  name: 'cloudbeaver',
                  image: 'dbeaver/cloudbeaver:24.2.0',
                  imagePullPolicy: 'Always',
                  port: [
                    {
                      containerPort: metaData.properties.port.containerPort,
                    },
                  ],
                  livenessProbe: {
                    httpGet: {
                      path: '/',
                      port: metaData.properties.port.containerPort.toString(),
                    },
                    initialDelaySeconds: 300,
                    periodSeconds: 300,
                    timeoutSeconds: 10,
                  },
                  volumeMount: [
                    {
                      name: metaData.properties.volume.workspace.volumeName,
                      mountPath:
                        metaData.properties.volume.workspace.containerDirPath,
                    },
                  ],
                },
              ],
              volume: [
                {
                  name: metaData.properties.volume.workspace.volumeName,
                  hostPath: {
                    type: 'DirectoryOrCreate',
                    path: metaData.properties.volume.workspace.hostDirPath,
                  },
                },
              ],
            },
          },
        },
      };
    },
  );

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationMetaStack: K8S_Workstation_Meta_Stack,
    private readonly k8sWorkstationServiceStack: K8S_Workstation_Service_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_StatefulSet_Stack.name,
      'StatefulSet stack for Workstation k8s',
    );
  }
}
