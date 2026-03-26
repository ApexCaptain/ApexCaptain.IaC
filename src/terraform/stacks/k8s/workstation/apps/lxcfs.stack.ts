import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import yaml from 'yaml';
import { K8S_Workstation_K8S_Stack } from '../k8s.stack';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
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

  /**
   * @Note: Node에서 Fuse 마운트 포지션이 꼬일 경우 (가령, stat /var/lib/lxcfs-on-k8s/lxcfs: transport)
   * 문제가 생긴 DaemonSet이 실행되는 Node에서 다음과 같이 실행.
   * sudo umount -l /var/lib/lxcfs-on-k8s/lxcfs
   * 이러면 대게 lxcfs DaemonSet이 재시작되면서 정상적으로 마운트 됨
   * 다음에 이런 문제가 또 발생하면, 이를 자동으로 복구하는 별도의 Daemonset을 추가하도록 하자
   */
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

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

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
