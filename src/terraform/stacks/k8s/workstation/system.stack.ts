import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import {
  AbstractStack,
  createK8sApplicationMetadata,
  OnPremiseNodePortInfo,
} from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { DataKubernetesNamespace } from '@lib/terraform/providers/kubernetes/data-kubernetes-namespace';
import { DataKubernetesService } from '@lib/terraform/providers/kubernetes/data-kubernetes-service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { DataKubernetesNodes } from '@lib/terraform/providers/kubernetes/data-kubernetes-nodes';
import { K8S_Workstation_NodeMeta_Stack } from './node-meta.stack';

@Injectable()
export class K8S_Workstation_System_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
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

  // dataNodes = this.provide(
  //   DataKubernetesNodes,
  //   'dataNodes',
  //   () => ({}),
  // ).addOutput(
  //   id => `${id}_out`,
  //   ele => ({
  //     value: ele.nodes,
  //   }),
  // );

  dataNamespace = this.provide(DataKubernetesNamespace, 'namespace', () => ({
    metadata: {
      name: 'kube-system',
    },
  }));

  dataKubernetesDashboardService = this.provide(
    DataKubernetesService,
    'dataKubernetesDashboardService',
    () => [
      {
        metadata: {
          name: 'kubernetes-dashboard',
          namespace: this.dataNamespace.element.metadata.name,
        },
      },
      {
        servicePort: 443,
      },
    ],
  );

  // nodePorts = (() => {
  //   // 30000~32767
  //   const onPremiseNodePortInfos = {
  //     nfsSftp: {
  //       nodePort: 30001,
  //       protocol: 'TCP',
  //     },
  //     nfsSft2: {
  //       nodePort: 30001,
  //       protocol: 'TCP',
  //     },
  //   };
  //   const onPremiseNodePortInfoValues = Object.values(onPremiseNodePortInfos);
  //   if (
  //     new Set(onPremiseNodePortInfoValues.map(each => each.nodePort)).size !==
  //     onPremiseNodePortInfoValues.length
  //   ) {
  //     throw new Error('Node ports must be unique.');
  //   }
  //   return onPremiseNodePortInfos;
  // })();

  applicationMetadata = this.provide(Resource, 'applicationMetadata', () => {
    return [
      {},
      {
        dashboard: createK8sApplicationMetadata({
          namespace: 'dashboard',
        }),

        istio: createK8sApplicationMetadata({
          namespace: 'istio-system',
          helm: {
            istiod: {
              name: 'istiod',
              chart: 'istiod',
              repository: 'https://istio-release.storage.googleapis.com/charts',
            },
            base: {
              name: 'istio-base',
              chart: 'base',
              repository: 'https://istio-release.storage.googleapis.com/charts',
            },
          },
        }),

        longhorn: createK8sApplicationMetadata({
          namespace: 'longhorn-system',
          helm: {
            longhorn: {
              name: 'longhorn',
              chart: 'longhorn',
              repository: 'https://charts.longhorn.io',
            },
          },
        }),
        // nfs: createK8sApplicationMetadata({
        //   namespace: 'nfs',
        //   helm: {
        //     'nfs-subdir-external-provisioner': {
        //       name: 'nfs-subdir-external-provisioner',
        //       chart: 'nfs-subdir-external-provisioner',
        //       repository:
        //         'https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner',
        //     },
        //   },
        //   services: {
        //     nfs: {
        //       name: 'nfs',
        //       labels: {
        //         app: 'nfs',
        //       },
        //       ports: {
        //         nfs: {
        //           name: 'nfs',
        //           port: 2049,
        //           targetPort: '2049',
        //           protocol: 'TCP',
        //         },
        //         'file-browser': {
        //           name: 'file-browser',
        //           port: 80,
        //           targetPort: '80',
        //           protocol: 'TCP',
        //         },
        //         sftp: {
        //           nodePort: 30001,
        //           name: 'sftp',
        //           port: 22,
        //           targetPort: '22',
        //           protocol: 'TCP',
        //         },
        //       },
        //     },
        //   },
        // }),
      },
    ];
  });

  constructor(
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sWorkstationNodeMetaStack: K8S_Workstation_NodeMeta_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_System_Stack.name,
      'System stack for workstation k8s',
    );
    this.addDependency(this.k8sWorkstationNodeMetaStack);
  }
}
