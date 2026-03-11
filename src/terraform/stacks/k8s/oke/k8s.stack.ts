import path from 'path';
import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Oke_Bastion_Stack } from './bastion.stack';
import { K8S_Oke_Cluster_Stack } from './cluster.stack';
import { AbstractStack, KubeConfig } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { File } from '@lib/terraform/providers/local/file';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import { DataOciContainerengineClusterKubeConfig } from '@lib/terraform/providers/oci/data-oci-containerengine-cluster-kube-config';
import { OciProvider } from '@lib/terraform/providers/oci/provider';
import cluster from 'cluster';

@Injectable()
export class K8S_Oke_K8S_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      local: this.provide(LocalProvider, 'localProvider', () => ({})),
      oci: this.provide(OciProvider, 'ociProvider', () =>
        this.terraformConfigService.providers.oci.ApexCaptain(),
      ),
    },
  };

  dataOkeKubeConfig = this.provide(
    DataOciContainerengineClusterKubeConfig,
    `dataOkeKubeConfig`,
    () => ({
      clusterId: this.k8sOkeClusterStack.okeCluster.element.id,
      endpoint: this.k8sOkeClusterStack.okeCluster.element.endpoints[0],
    }),
  );

  kubeConfigFile = this.provide(File, 'kubeConfigFile', () => {
    const clusterName = 'oke';
    const contextName = clusterName;
    const userName = `${clusterName}-user`;
    const sourceKubeConfigInfo: KubeConfig = Fn.yamldecode(
      this.dataOkeKubeConfig.element.content,
    );

    const kubeConfig = {
      apiVersion: 'v1',
      kind: 'Config',
      preferences: {},
      'current-context': contextName,
      clusters: [
        {
          name: clusterName,
          cluster: {
            'proxy-url': `socks5://${this.k8sOkeBastionStack.okeBastionSessionContainer.element.networkData.get(0).ipAddress}:${this.k8sOkeBastionStack.config.sessionTunnelPort}`,
            server: Fn.lookupNested(sourceKubeConfigInfo, [
              'clusters',
              0,
              'cluster',
              'server',
            ]),
            'certificate-authority-data': Fn.lookupNested(
              sourceKubeConfigInfo,
              ['clusters', 0, 'cluster', 'certificate-authority-data'],
            ),
          },
        },
      ],
      contexts: [
        {
          name: contextName,
          context: {
            cluster: clusterName,
            user: userName,
          },
        },
      ],
      users: [
        {
          name: userName,
          user: Fn.lookupNested(sourceKubeConfigInfo, ['users', 0, 'user']),
        },
      ],
    };

    return [
      {
        content: Fn.yamlencode(kubeConfig),
        filename: path.join(
          process.cwd(),
          this.globalConfigService.config.terraform.stacks.common
            .kubeConfigDirRelativePath,
          `${this.id}.yaml`,
        ),
      },
      {
        kubeConfig,
      },
    ];
  });

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly k8sOkeClusterStack: K8S_Oke_Cluster_Stack,
    private readonly k8sOkeBastionStack: K8S_Oke_Bastion_Stack,
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_K8S_Stack.name,
      'K8S OKE K8S Stack',
    );
  }
}
