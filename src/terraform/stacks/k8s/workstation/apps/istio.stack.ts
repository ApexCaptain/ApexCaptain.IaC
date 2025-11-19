import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import _ from 'lodash';
import yaml from 'yaml';
import { K8S_Oke_Network_Stack } from '../../oke/network.stack';
import { K8S_Workstation_System_Stack } from '../system.stack';
import { K8S_Workstation_Apps_Metallb_Stack } from './metallb.stack';
import { IstioPeerAuthentication } from '@/common';
import { AbstractStack } from '@/common/abstract/abstract.stack';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { HelmProvider } from '@lib/terraform/providers/helm/provider';
import { Release } from '@lib/terraform/providers/helm/release';
import { ClusterRoleBindingV1 } from '@lib/terraform/providers/kubernetes/cluster-role-binding-v1';
import { ClusterRoleV1 } from '@lib/terraform/providers/kubernetes/cluster-role-v1';
import { DataKubernetesSecretV1 } from '@lib/terraform/providers/kubernetes/data-kubernetes-secret-v1';
import { NamespaceV1 } from '@lib/terraform/providers/kubernetes/namespace-v1';
import { KubernetesProvider } from '@lib/terraform/providers/kubernetes/provider';
import { SecretV1 } from '@lib/terraform/providers/kubernetes/secret-v1';
import { ServiceAccountV1 } from '@lib/terraform/providers/kubernetes/service-account-v1';
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
        'topology.istio.io/network':
          this.globalConfigService.config.terraform.stacks.k8s.serviceMesh
            .workstationClusterName,
      },
      annotations: {
        'topology.istio.io/controlPlaneClusters':
          this.globalConfigService.config.terraform.stacks.k8s.serviceMesh
            .okeClusterName,
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
              clusterName:
                this.globalConfigService.config.terraform.stacks.k8s.serviceMesh
                  .workstationClusterName,
            },
            network:
              this.globalConfigService.config.terraform.stacks.k8s.serviceMesh
                .workstationClusterName,
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
              networkGateway:
                this.globalConfigService.config.terraform.stacks.k8s.serviceMesh
                  .workstationClusterName,
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

  kialiRemoteAccessServiceAccount = this.provide(
    ServiceAccountV1,
    'kialiRemoteAccessServiceAccount',
    id => {
      const name = _.kebabCase(id);
      return {
        metadata: {
          name,
          namespace: this.namespace.element.metadata.name,
        },
        secret: [
          {
            name: `${name}-token`,
          },
        ],
      };
    },
  );

  kialiRemoteAccessClusterRole = this.provide(
    ClusterRoleV1,
    'kialiRemoteAccessClusterRole',
    id => ({
      metadata: {
        name: _.kebabCase(id),
      },
      rule: [
        {
          apiGroups: ['*'],
          resources: ['*'],
          verbs: ['get', 'list', 'watch'],
        },
        {
          nonResourceUrls: ['*'],
          verbs: ['get'],
        },
      ],
    }),
  );

  kialiRemoteAccessClusterRoleBinding = this.provide(
    ClusterRoleBindingV1,
    'kialiRemoteAccessClusterRoleBinding',
    id => ({
      metadata: {
        name: _.kebabCase(id),
      },
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ClusterRole',
        name: this.kialiRemoteAccessClusterRole.element.metadata.name,
      },
      subject: [
        {
          kind: 'ServiceAccount',
          name: this.kialiRemoteAccessServiceAccount.element.metadata.name,
          namespace: this.namespace.element.metadata.name,
        },
      ],
    }),
  );

  kialiRemoteAccessServiceAccountSecret = this.provide(
    SecretV1,
    'kialiRemoteAccessServiceAccountSecret',
    () => ({
      metadata: {
        name: this.kialiRemoteAccessServiceAccount.element.secret.get(0).name,
        annotations: {
          'kubernetes.io/service-account.name':
            this.kialiRemoteAccessServiceAccount.element.metadata.name,
        },
        namespace:
          this.kialiRemoteAccessServiceAccount.element.metadata.namespace,
        generateName:
          this.kialiRemoteAccessServiceAccount.element.secret.get(0).name,
      },
      type: 'kubernetes.io/service-account-token',
      waitForServiceAccountToken: true,
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
