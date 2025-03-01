import path from 'path';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Oke_Bastion_Stack } from './bastion.stack';
import { K8S_Oke_Cluster_Stack } from './cluster.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import { SensitiveFile } from '@lib/terraform/providers/local/sensitive-file';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { DataOciContainerengineClusterKubeConfig } from '@lib/terraform/providers/oci/data-oci-containerengine-cluster-kube-config';
import { OciProvider } from '@lib/terraform/providers/oci/provider';

@Injectable()
export class K8S_Oke_Endpoint_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      local: this.provide(LocalProvider, 'localProvider', () => ({})),
      oci: this.provide(OciProvider, 'ociProvider', () =>
        this.terraformConfigService.providers.oci.ApexCaptain(),
      ),
    },
  };

  private okeKubeConfig = this.provide(Resource, 'okeKubeConfig', idPrefix => {
    const dataKubeConfig = this.provide(
      DataOciContainerengineClusterKubeConfig,
      `${idPrefix}-dataKubeConfig`,
      () => ({
        clusterId: this.k8sOkeClusterStack.okeCluster.element.id,
        endpoint: this.k8sOkeClusterStack.okeCluster.element.endpoints[0],
      }),
    );

    const kubeConfigFile = this.provide(
      SensitiveFile,
      `${idPrefix}-kubeConfigFile`,
      id => ({
        filename: path.join(
          process.cwd(),
          this.globalConfigService.config.terraform.stacks.common
            .kubeConfigDirRelativePath,
          `${id}.config`,
        ),
        content: dataKubeConfig.element.content,
        lifecycle: {
          createBeforeDestroy: true,
        },
      }),
    );

    return [
      {},
      {
        dataKubeConfig,
        kubeConfigFile,
      },
    ];
  });

  okeEndpointSource = this.provide(SensitiveFile, 'okeEndpointSource', id => {
    const simpleProxyUrl = `${this.k8sOkeBastionStack.okeBastionSessionContainer.element.networkData.get(0).ipAddress}:${this.k8sOkeBastionStack.okeBastionSessionTunnelPort.element.result}`;
    const socks5ProxyUrl = `socks5://${simpleProxyUrl}`;

    const data = {
      proxyUrl: {
        simple: simpleProxyUrl,
        socks5: socks5ProxyUrl,
      },
      privateKeyFilePath:
        this.k8sOkeClusterStack.privateKey.shared.privateSshKeyFileInKeys
          .element.filename,
      kubeConfigFilePath:
        this.okeKubeConfig.shared.kubeConfigFile.element.filename,
      nodes: _.range(
        0,
        this.k8sOkeClusterStack.okeArmNodePool.element.nodeConfigDetailsInput
          ?.size ?? 0,
      ).map(eachIndex => {
        return {
          userName: 'opc',
          sshPort: 22,
          privateIp:
            this.k8sOkeClusterStack.okeArmNodePool.element.nodes.get(eachIndex)
              .privateIp,
        };
      }),
    };

    return [
      {
        filename: path.join(
          process.cwd(),
          this.globalConfigService.config.terraform.config
            .generatedScriptLibDirRelativePath,
          `${K8S_Oke_Endpoint_Stack.name}-${id}.ts`,
        ),
        content: `export const ${id} = ${JSON.stringify(data, null, 2)}`,
        lifecycle: {
          createBeforeDestroy: true,
        },
      },
      data,
    ];
  });

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeBastionStack: K8S_Oke_Bastion_Stack,
    private readonly k8sOkeClusterStack: K8S_Oke_Cluster_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Endpoint_Stack.name,
      'K8S OKE Endpoint Stack',
    );
    this.addDependency(this.k8sOkeBastionStack);
    this.addDependency(this.k8sOkeClusterStack);
  }
}
