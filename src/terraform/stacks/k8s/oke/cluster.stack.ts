import path from 'path';
import { Injectable } from '@nestjs/common';
import { Fn, LocalBackend } from 'cdktf';
import _ from 'lodash';
import { K8S_Oke_Compartment_Stack } from './compartment.stack';
import { K8S_Oke_Network_Stack } from './network.stack';
import { Project_Stack } from '../../project.stack';
import { AbstractStack } from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { LocalProvider } from '@lib/terraform/providers/local/provider';
import { SensitiveFile } from '@lib/terraform/providers/local/sensitive-file';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { Resource } from '@lib/terraform/providers/null/resource';
import { ContainerengineCluster } from '@lib/terraform/providers/oci/containerengine-cluster';
import { ContainerengineNodePool } from '@lib/terraform/providers/oci/containerengine-node-pool';
import { OciProvider } from '@lib/terraform/providers/oci/provider';
import { PrivateKey } from '@lib/terraform/providers/tls/private-key';
import { TlsProvider } from '@lib/terraform/providers/tls/provider';

@Injectable()
export class K8S_Oke_Cluster_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      local: this.provide(LocalProvider, 'localProvider', () => ({})),
      tls: this.provide(TlsProvider, 'tlsProvider', () => ({})),
      oci: this.provide(OciProvider, 'ociProvider', () =>
        this.terraformConfigService.providers.oci.ApexCaptain(),
      ),
    },
  };

  privateKey = this.provide(Resource, 'privateKey', idPrefix => {
    const key = this.provide(PrivateKey, `${idPrefix}-key`, () => ({
      algorithm: 'RSA',
      rsaBits: 4096,
    }));

    const privateSshKeyFileInKeys = this.provide(
      SensitiveFile,
      `${idPrefix}-privateSshKeyFileInKeys`,
      id => ({
        filename: path.join(
          process.cwd(),
          this.globalConfigService.config.terraform.stacks.common
            .generatedKeyFilesDirPaths.relativeKeysDirPath,
          `${K8S_Oke_Cluster_Stack.name}-${id}.key`,
        ),
        content: key.element.privateKeyOpenssh,
        filePermission: '0600',
      }),
    );

    return [
      {},
      {
        key,
        privateSshKeyFileInKeys,
      },
    ];
  });

  okeCluster = this.provide(ContainerengineCluster, 'okeCluster', id => ({
    compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
    displayName: id,
    // @Note https://docs.oracle.com/en-us/iaas/Content/ContEng/Concepts/contengaboutk8sversions.htm
    // kubernetesVersion: 'v1.32.1',
    kubernetesVersion: 'v1.33.1',
    name: id,
    vcnId: this.k8sOkeNetworkStack.okeVcn.element.id,

    clusterPodNetworkOptions: [{ cniType: 'FLANNEL_OVERLAY' }],
    endpointConfig: {
      isPublicIpEnabled: false,
      subnetId: this.k8sOkeNetworkStack.okeK8sEndpointPrivateSubnet.element.id,
    },
    options: {
      addOns: {
        isKubernetesDashboardEnabled: true,
        isTillerEnabled: true,
      },
      serviceLbSubnetIds: [
        this.k8sOkeNetworkStack.okeServiceLoadBalancerPublicSubnet.element.id,
      ],
    },
    type: 'BASIC_CLUSTER',
  }));

  // Node Pools
  okeArmNodePool = this.provide(
    ContainerengineNodePool,
    'okeArmNodePool',
    id => ({
      clusterId: this.okeCluster.element.id,
      compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
      displayName: id,
      name: id,

      nodeConfigDetails: {
        placementConfigs: [
          {
            availabilityDomain:
              this.projectStack.dataOciAvailabilityDomain.element.name,
            subnetId:
              this.k8sOkeNetworkStack.okeWorkerNodePrivateSubnet.element.id,
          },
        ],
        size: 2,
        nodePoolPodNetworkOptionDetails: {
          cniType: 'FLANNEL_OVERLAY',
        },
      },
      nodeSourceDetails: {
        imageId:
          'ocid1.image.oc1.ap-chuncheon-1.aaaaaaaahe7qtoxzq42rdvll5mhx7bpgibtvguxipbt5ueyrmzc7q3hrwlla',
        sourceType: 'IMAGE',
      },
      nodeShape: 'VM.Standard.A1.Flex',
      nodeShapeConfig: {
        memoryInGbs: 12,
        ocpus: 2,
      },
      sshPublicKey: this.privateKey.shared.key.element.publicKeyOpenssh,
      lifecycle: {
        preventDestroy: true,
      },
    }),
  );

  okeArmNodePoolV2 = this.provide(
    ContainerengineNodePool,
    'okeArmNodePoolV2',
    id => ({
      count: process.env.UPGRADE_OKE_NODE_POOL === 'true' ? 1 : 0,
      clusterId: this.okeCluster.element.id,
      compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
      displayName: id,
      name: id,

      nodeConfigDetails: {
        placementConfigs: [
          {
            availabilityDomain:
              this.projectStack.dataOciAvailabilityDomain.element.name,
            subnetId:
              this.k8sOkeNetworkStack.okeWorkerNodePrivateSubnet.element.id,
          },
        ],
        size: 4,
        nodePoolPodNetworkOptionDetails: {
          cniType: 'FLANNEL_OVERLAY',
        },
      },
      nodeSourceDetails: {
        // https://docs.oracle.com/en-us/iaas/images/oke-worker-node-oracle-linux-8x/oracle-linux-8.10-aarch64-2025.11.20-0-oke-1.33.1-1345.htm
        imageId:
          'ocid1.image.oc1.ap-chuncheon-1.aaaaaaaa52lhvtuxyk5tbdhx5a6kptv4byvtefcvyyjh53errs234cnvildq',
        sourceType: 'IMAGE',
      },
      nodeShape: 'VM.Standard.A1.Flex',
      nodeShapeConfig: {
        memoryInGbs: 6,
        ocpus: 1,
      },
      sshPublicKey: this.privateKey.shared.key.element.publicKeyOpenssh,
      lifecycle: {
        preventDestroy: true,
      },
    }),
  );

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly projectStack: Project_Stack,
    private readonly k8sOkeCompartmentStack: K8S_Oke_Compartment_Stack,
    private readonly k8sOkeNetworkStack: K8S_Oke_Network_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Cluster_Stack.name,
      'K8S OKE Cluster stack',
    );
  }
}
