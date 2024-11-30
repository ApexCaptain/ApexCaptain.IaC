import { AbstractStack } from '@/common';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { OciProvider } from '@lib/terraform/providers/oci/provider';
import { Injectable } from '@nestjs/common';
import { LocalBackend, TerraformIterator } from 'cdktf';
import { File } from '@lib/terraform/providers/local/file';
import { ContainerengineCluster } from '@lib/terraform/providers/oci/containerengine-cluster';
import { ContainerengineNodePool } from '@lib/terraform/providers/oci/containerengine-node-pool';
import { Oci_Compartment_Stack } from './compartment.stack';
import { Oci_Network_Stack } from './network.stack';
import { Oci_RootData_Stack } from './root-data.stack';
import { TlsProvider } from '@lib/terraform/providers/tls/provider';
import { PrivateKey } from '@lib/terraform/providers/tls/private-key';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import path from 'path';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { DataOciContainerengineClusterKubeConfig } from '@lib/terraform/providers/oci/data-oci-containerengine-cluster-kube-config';

@Injectable()
export class Oci_Oke_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBakcned.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      local: this.provide(LocalProvider, 'localProvider', () => ({})),
      tls: this.provide(TlsProvider, 'tlsProvider', () => ({})),
      oci: this.provide(OciProvider, 'ociProvider', () =>
        this.terraformConfigService.providers.oci.ApexCaptain(),
      ),
    },
  };

  // dataOkeNodePoolOption = this.provide(
  //   DataOciContainerengineNodePoolOption,
  //   'dataOkeNodePoolOption',
  //   () => ({
  //     compartmentId: this.ociCompartmentStack.kubernetesCompartment.element.id,
  //     nodePoolOptionId: this.okeCluster.element.id,
  //   }),
  // ).addOutput(
  //   id => `${id}_output`,
  //   ele => ({
  //     value: ele.sources,
  //   }),
  // );

  // dataOkeClusterKubeConfig = this.provide(
  //   DataOciContainerengineClusterKubeConfig,
  //   'dataOkeClusterKubeConfig',
  //   () => ({
  //     clusterId: this.okeCluster.element.id,
  //     endpoint: this.okeCluster.element.endpoints[0],
  //   }),
  // );

  // okeClusterKubeConfigFile = this.provide(
  //   File,
  //   'okeClusterKubeConfigFile',
  //   id => ({
  //     filename: path.join(
  //       process.cwd(),
  //       this.globalConfigService.config.terraform.stacks.common
  //         .kubeConfigDirRelativePath,
  //       `${id}.config`,
  //     ),
  //     content: this.dataOkeClusterKubeConfig.element.content,
  //   }),
  // );

  // okeNodePoolSshKey = this.provide(PrivateKey, 'okeNodePoolSshKey', () => ({
  //   algorithm: 'RSA',
  //   rsaBits: 4096,
  // }));

  // okeNodePoolSshKeyPrivateOpenSshFileInSecrets = this.provide(
  //   File,
  //   'okeNodePoolSshKeyPrivateOpenSshFileInSecrets',
  //   id => ({
  //     filename: path.join(
  //       process.cwd(),
  //       this.globalConfigService.config.terraform.stacks.common
  //         .generatedKeyFilesDirRelativePaths.secrets,
  //       Oci_Oke_Stack.name,
  //       `${id}.key`,
  //     ),
  //     content: this.okeNodePoolSshKey.element.privateKeyOpenssh,
  //   }),
  // );

  // okeNodePoolSshKeyPrivateOpenSshFileInKeys = this.provide(
  //   File,
  //   'okeNodePoolSshKeyPrivateOpenSshFileInKeys',
  //   id => ({
  //     filename: path.join(
  //       process.cwd(),
  //       this.globalConfigService.config.terraform.stacks.common
  //         .generatedKeyFilesDirRelativePaths.keys,
  //       Oci_Oke_Stack.name,
  //       `${id}.key`,
  //     ),
  //     content: this.okeNodePoolSshKey.element.privateKeyOpenssh,
  //     filePermission: '0600',
  //   }),
  // );

  // okeCluster = this.provide(ContainerengineCluster, 'okeCluster', id => ({
  //   compartmentId: this.ociCompartmentStack.kubernetesCompartment.element.id,
  //   displayName: id,
  //   kubernetesVersion: 'v1.31.1',
  //   name: id,
  //   vcnId: this.ociNetworkStack.okeVcn.element.id,

  //   clusterPodNetworkOptions: [{ cniType: 'FLANNEL_OVERLAY' }],
  //   endpointConfig: {
  //     isPublicIpEnabled: false,
  //     subnetId: this.ociNetworkStack.okeK8sEndpointPrivateSubnet.element.id,
  //   },
  //   options: {
  //     serviceLbSubnetIds: [
  //       this.ociNetworkStack.okeServiceLoadBalancerPublicSubnet.element.id,
  //     ],
  //   },
  //   type: 'BASIC_CLUSTER',
  // }));

  // okeArmNodePool = this.provide(
  //   ContainerengineNodePool,
  //   'okeArmNodePool',
  //   id => ({
  //     clusterId: this.okeCluster.element.id,
  //     compartmentId: this.ociCompartmentStack.kubernetesCompartment.element.id,
  //     displayName: id,
  //     name: id,

  //     nodeConfigDetails: {
  //       placementConfigs: [
  //         {
  //           availabilityDomain:
  //             this.ociRootDataStack.dataAvailabilityDomain.element.name,
  //           subnetId:
  //             this.ociNetworkStack.okeWorkerNodePrivateSubnet.element.id,
  //         },
  //       ],
  //       size: 4,

  //       nodePoolPodNetworkOptionDetails: {
  //         cniType: 'FLANNEL_OVERLAY',
  //       },
  //     },
  //     nodeSourceDetails: {
  //       // @Note: 무슨 이유에서인지 dataCoreImages로는 검색이 안 됨. 별도로 output만들어서 수동으로 가져옴
  //       // @ToDo: 추후 자동화 필요
  //       // @See: https://github.com/oracle/terraform-provider-oci/issues/1771
  //       imageId:
  //         'ocid1.image.oc1.ap-chuncheon-1.aaaaaaaahe7qtoxzq42rdvll5mhx7bpgibtvguxipbt5ueyrmzc7q3hrwlla',
  //       sourceType: 'IMAGE',
  //     },
  //     nodeShape: 'VM.Standard.A1.Flex',
  //     nodeShapeConfig: {
  //       memoryInGbs: 6,
  //       ocpus: 1,
  //     },
  //     sshPublicKey: this.okeNodePoolSshKey.element.publicKeyOpenssh,
  //   }),
  // );

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly ociCompartmentStack: Oci_Compartment_Stack,
    private readonly ociNetworkStack: Oci_Network_Stack,
    private readonly ociRootDataStack: Oci_RootData_Stack,
  ) {
    super(terraformAppService.cdktfApp, Oci_Oke_Stack.name, 'OCI OKE stack');
  }
}
