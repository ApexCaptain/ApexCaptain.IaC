import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { AbstractStack, createK8sApplicationMetadata } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { DataKubernetesNamespace } from '@lib/terraform/providers/kubernetes/data-kubernetes-namespace';
import { DataKubernetesService } from '@lib/terraform/providers/kubernetes/data-kubernetes-service';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
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

  // dataNamespace = this.provide(DataKubernetesNamespace, 'namespace', () => ({
  //   metadata: {
  //     name: 'kube-system',
  //   },
  // }));

  // dataKubernetesDashboardService = this.provide(
  //   DataKubernetesService,
  //   'dataKubernetesDashboardService',
  //   () => [
  //     {
  //       metadata: {
  //         name: 'kubernetes-dashboard',
  //         namespace: this.dataNamespace.element.metadata.name,
  //       },
  //     },
  //     {
  //       servicePort: 443,
  //     },
  //   ],
  // );

  // applicationMetadata = this.provide(Resource, 'applicationMetadata', () => {
  //   return [
  //     {},
  //     {
  //       dashboard: createK8sApplicationMetadata({
  //         namespace: 'dashboard',
  //       }),

  //       istio: createK8sApplicationMetadata({
  //         namespace: 'istio-system',
  //         helm: {
  //           istiod: {
  //             name: 'istiod',
  //             chart: 'istiod',
  //             repository: 'https://istio-release.storage.googleapis.com/charts',
  //           },
  //           base: {
  //             name: 'istio-base',
  //             chart: 'base',
  //             repository: 'https://istio-release.storage.googleapis.com/charts',
  //           },
  //         },
  //       }),

  //       ceph: createK8sApplicationMetadata({
  //         namespace: 'rook-ceph',
  //         helm: {
  //           cephOperator: {
  //             name: 'rook-ceph',
  //             chart: 'rook-ceph',
  //             repository: 'https://charts.rook.io/release',
  //           },
  //           cephCluster: {
  //             name: 'rook-ceph-cluster',
  //             chart: 'rook-ceph-cluster',
  //             repository: 'https://charts.rook.io/release',
  //           },
  //         },
  //       }),

  //       //
  //       longhorn: createK8sApplicationMetadata({
  //         namespace: 'longhorn',
  //         helm: {
  //           longhorn: {
  //             name: 'longhorn',
  //             chart: 'longhorn',
  //             repository: 'https://charts.longhorn.io',
  //           },
  //         },
  //       }),

  //       test1: createK8sApplicationMetadata({
  //         namespace: 'test1',
  //       }),

  //       test2: createK8sApplicationMetadata({
  //         namespace: 'test1',
  //       }),
  //     },
  //   ];
  // });

  constructor(
    // Terraform
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
