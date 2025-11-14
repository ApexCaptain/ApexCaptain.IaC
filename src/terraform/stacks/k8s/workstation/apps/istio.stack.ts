import { Injectable } from '@nestjs/common';
import { LocalBackend, LocalExecProvisioner } from 'cdktf';
import dedent from 'dedent';
import _ from 'lodash';
import yaml from 'yaml';
import { K8S_Oke_Network_Stack } from '../../oke/network.stack';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { K8S_Workstation_Apps_Metallb_Stack } from './metallb.stack';
import { IstioPeerAuthentication, IstioServiceEntry } from '@/common';
import { AbstractStack } from '@/common/abstract/abstract.stack';
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
export class K8S_Workstation_Apps_Istio_Stack extends AbstractStack {
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
      helm: this.provide(HelmProvider, 'helmProvider', () => ({
        kubernetes: {
          configPath:
            this.terraformConfigService.providers.kubernetes.ApexCaptain.workstation()
              .configPath,
          insecure: true,
        },
      })),
    },
  };

  metadata = this.provide(Resource, 'metadata', () => [
    {},
    this.k8sWorkstationSystemStack.applicationMetadata.shared.istio,
  ]);

  namespace = this.provide(NamespaceV1, 'namespace', () => ({
    metadata: {
      name: this.metadata.shared.namespace,
      labels: {
        'topology.istio.io/network': 'workstation',
      },
      annotations: {
        'topology.istio.io/controlPlaneClusters': 'oke',
      },
    },
  }));

  istioBaseRelease = this.provide(Release, 'istioBaseRelease', () => {
    return {
      name: this.metadata.shared.helm.base.name,
      chart: this.metadata.shared.helm.base.chart,
      repository: this.metadata.shared.helm.base.repository,
      namespace: this.namespace.element.metadata.name,
      createNamespace: false,
      values: [
        yaml.stringify({
          profile: 'remote',
        }),
      ],
    };
  });

  istiodRelease = this.provide(Release, 'istiodRelease', () => {
    return {
      name: this.metadata.shared.helm.istiod.name,
      chart: this.metadata.shared.helm.istiod.chart,
      repository: this.metadata.shared.helm.istiod.repository,
      namespace: this.namespace.element.metadata.name,
      createNamespace: false,
      dependsOn: [this.istioBaseRelease.element],
      values: [
        yaml.stringify({
          profile: 'remote',
          global: {
            configCluster: true,
            remotePilotAddress:
              this.k8sOkeNetworkStack
                .ingressControllerFlexibleLoadbalancerReservedPublicIp.element
                .ipAddress,
            multiCluster: {
              clusterName: 'workstation',
            },
            network: 'workstation',
          },
          istiodRemote: {
            istiodRemote: true,
            injectionPath: '/inject/cluster/workstation/net/workstation',
          },
        }),
      ],
    };
  });

  istioEastWestGatewayRelease = this.provide(
    Release,
    'istioEastWestGatewayRelease',
    () => {
      const istioLabel = 'eastwestgateway';
      const name = `istio-${istioLabel}`;

      return [
        {
          name: this.metadata.shared.helm.istioEastWestGateway.name,
          chart: this.metadata.shared.helm.istioEastWestGateway.chart,
          repository: this.metadata.shared.helm.istioEastWestGateway.repository,
          namespace: this.namespace.element.metadata.name,
          createNamespace: false,
          dependsOn: [
            this.istioBaseRelease.element,
            this.istiodRelease.element,
          ],
          values: [
            yaml.stringify({
              name,
              networkGateway: 'workstation',
              service: {
                type: 'LoadBalancer',
                loadBalancerIP:
                  this.k8sWorkstationAppsMetallbStack.config
                    .istioCrossNetworkGatewayIp,
                externalIPs: [
                  this.globalConfigService.config.terraform.stacks.k8s
                    .workstation.common.workstationIpv4Ip,
                ],
              },
            }),
          ],
        },
        {
          name,
          istioLabel,
        },
      ];
    },
  );

  defaultPeerAuthentication = this.provide(
    IstioPeerAuthentication,
    'defaultPeerAuthentication',
    () => ({
      manifest: {
        metadata: {
          name: 'default',
          namespace: this.namespace.element.metadata.name,
        },
        spec: {
          mtls: {
            mode: 'PERMISSIVE' as const,
          },
        },
      },
      dependsOn: [this.istioBaseRelease.element],
    }),
  );

  constructor(
    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Stacks
    private readonly k8sWorkstationSystemStack: K8S_Workstation_System_Stack,
    private readonly k8sOkeNetworkStack: K8S_Oke_Network_Stack,
    private readonly k8sWorkstationAppsMetallbStack: K8S_Workstation_Apps_Metallb_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Workstation_Apps_Istio_Stack.name,
      'Istio stack for workstation k8s',
    );
  }
}
