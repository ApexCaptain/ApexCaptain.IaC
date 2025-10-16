import path from 'path';
import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
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
    kubernetesVersion: 'v1.32.1',
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
        /**
         * @note
         * - 무슨 이유에서인지 dataCoreImages로는 검색이 안 됨. 별도로 output만들어서 수동으로 가져옴
         * - 추후 자동화 필요
         * @see: https://github.com/oracle/terraform-provider-oci/issues/1771
         */
        imageId:
          'ocid1.image.oc1.ap-chuncheon-1.aaaaaaaahe7qtoxzq42rdvll5mhx7bpgibtvguxipbt5ueyrmzc7q3hrwlla',
        sourceType: 'IMAGE',
      },
      /**
       * @note
       * - Cycling 사용하려면 Basic Type으론 안된다.
       * - Enhanced Cluster로 Type 변경하란다... 시간당 $0.1 소모됨.
       */
      // nodePoolCyclingDetails: {
      //   isNodeCyclingEnabled: true,
      //   maximumSurge: '0',
      //   maximumUnavailable: '50%',
      // },
      nodeShape: 'VM.Standard.A1.Flex',
      nodeShapeConfig: {
        memoryInGbs: 12,
        ocpus: 2,
      },
      sshPublicKey: this.privateKey.shared.key.element.publicKeyOpenssh,
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
