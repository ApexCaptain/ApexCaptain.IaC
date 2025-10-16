import { Injectable } from '@nestjs/common';
import { LocalBackend } from 'cdktf';
import { K8S_Oke_Compartment_Stack } from './compartment.stack';
import {
  AbstractStack,
  OciNetworkProtocol,
  OciNetworkSourceType,
  createLoadBalancerPortInfo,
} from '@/common';
import { GlobalConfigService } from '@/global/config/global.config.schema.service';
import { TerraformAppService } from '@/terraform/terraform.app.service';
import { TerraformConfigService } from '@/terraform/terraform.config.service';
import { NullProvider } from '@lib/terraform/providers/null/provider';
import { CoreDhcpOptions } from '@lib/terraform/providers/oci/core-dhcp-options';
import { CoreInternetGateway } from '@lib/terraform/providers/oci/core-internet-gateway';
import { CoreNatGateway } from '@lib/terraform/providers/oci/core-nat-gateway';
import { CorePublicIp } from '@lib/terraform/providers/oci/core-public-ip';
import { CoreRouteTable } from '@lib/terraform/providers/oci/core-route-table';
import { CoreSecurityList } from '@lib/terraform/providers/oci/core-security-list';
import { CoreServiceGateway } from '@lib/terraform/providers/oci/core-service-gateway';
import { CoreSubnet } from '@lib/terraform/providers/oci/core-subnet';
import { CoreVcn } from '@lib/terraform/providers/oci/core-vcn';
import { OciProvider } from '@lib/terraform/providers/oci/provider';

@Injectable()
export class K8S_Oke_Network_Stack extends AbstractStack {
  terraform = {
    backend: this.backend(LocalBackend, () =>
      this.terraformConfigService.backends.localBackend.secrets({
        stackName: this.id,
      }),
    ),
    providers: {
      null: this.provide(NullProvider, 'nullProvider', () => ({})),
      oci: this.provide(OciProvider, 'ociProvider', () =>
        this.terraformConfigService.providers.oci.ApexCaptain(),
      ),
    },
  };

  ingressControllerFlexibleLoadbalancerReservedPublicIp = this.provide(
    CorePublicIp,
    'ingressControllerFlexibleLoadbalancerReservedPublicIp',
    id => ({
      compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
      displayName: id,
      lifetime: 'RESERVED',

      lifecycle: {
        preventDestroy: true,
        ignoreChanges: ['private_ip_id'],
      },
    }),
  );

  // @See https://docs.oracle.com/en-us/iaas/application-integration/doc/availability.html
  allYnyServiceMeta = {
    id: 'ocid1.service.oc1.ap-chuncheon-1.aaaaaaaav26pw33pfolcobpj62iy6pq2xkkzeiizc2m64i2elbdj5mw4dnra',
    name: 'All YNY Services In Oracle Services Network',
    destination: 'all-yny-services-in-oracle-services-network',
  };

  cidrBlockMeta = {
    okeVcnCidrBlock: '10.0.0.0/16',
    okeK8sEndpointPrivateSubnetCidrBlock: '10.0.0.0/30',
    okeWorkerNodePrivateSubnetCidrBlock: '10.0.1.0/24',
    okeServiceLoadBalancerPublicSubnetCidrBlock: '10.0.2.0/24',
    okeBastionPrivateSubnetCidrBlock: '10.0.3.0/24',
  };

  loadbalancerPortMappings = (() => {
    const httpNodePort = createLoadBalancerPortInfo({
      inbound: 80,
    });

    const httpsNodePort = createLoadBalancerPortInfo({
      inbound: 443,
    });

    const nfsSftpNodePort = createLoadBalancerPortInfo({
      inbound: 8022,
      protocol: OciNetworkProtocol.TCP,
      description: 'SFTP port for NFS service',
    });

    const combination = {
      httpNodePort,
      httpsNodePort,
      nfsSftpNodePort,
    };

    const inboundPorts = Object.values(combination).map(
      eachPort => eachPort.inbound,
    );
    if (new Set(inboundPorts).size !== inboundPorts.length) {
      throw new Error('Inbound ports must be unique.');
    }

    return combination;
  })();

  // VCN
  okeVcn = this.provide(CoreVcn, 'okeVcn', id => ({
    cidrBlock: this.cidrBlockMeta.okeVcnCidrBlock,
    compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
    displayName: id,
    dnsLabel: 'oke',
    lifecycle: {
      preventDestroy: true,
    },
  }));

  okeInternetGateway = this.provide(
    CoreInternetGateway,
    'okeInternetGateway',
    id => ({
      compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
      displayName: id,
      vcnId: this.okeVcn.element.id,
      enabled: true,
    }),
  );

  okeNatGateway = this.provide(CoreNatGateway, 'okeNatGateway', id => ({
    compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
    displayName: id,
    vcnId: this.okeVcn.element.id,
  }));

  okeServiceGateway = this.provide(
    CoreServiceGateway,
    'okeServiceGateway',
    id => ({
      compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
      displayName: id,
      vcnId: this.okeVcn.element.id,
      services: [
        {
          serviceId: this.allYnyServiceMeta.id,
        },
      ],
    }),
  );

  okeDhcpOption = this.provide(CoreDhcpOptions, 'okeDhcpOption', id => ({
    compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
    displayName: id,
    vcnId: this.okeVcn.element.id,
    options: [
      {
        type: 'DomainNameServer',
        serverType: 'VcnLocalPlusInternet',
      },
    ],
  }));

  // K8s Endpoint Private Subnet
  okeK8sEndpointPrivateSubnetRouteTable = this.provide(
    CoreRouteTable,
    'okeK8sEndpointPrivateSubnetRouteTable',
    id => ({
      compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
      displayName: id,
      vcnId: this.okeVcn.element.id,
      routeRules: [
        {
          destination: '0.0.0.0/0',
          destinationType: OciNetworkSourceType.CIDR_BLOCK,
          networkEntityId: this.okeNatGateway.element.id,
        },
        {
          destination: this.allYnyServiceMeta.destination,
          destinationType: OciNetworkSourceType.SERVICE_CIDR_BLOCK,
          networkEntityId: this.okeServiceGateway.element.id,
        },
      ],
    }),
  );
  okeK8sEndpointPrivateSubnetSecurityList = this.provide(
    CoreSecurityList,
    'okeK8sEndpointPrivateSubnetSecurityList',
    id => ({
      compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
      displayName: id,
      vcnId: this.okeVcn.element.id,
      ingressSecurityRules: [
        {
          source: this.cidrBlockMeta.okeWorkerNodePrivateSubnetCidrBlock,
          sourceType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.TCP,
          tcpOptions: {
            min: 6443,
            max: 6443,
          },
          description:
            'Kubernetes worker to Kubernetes API endpoint communication.',
        },
        {
          source: this.cidrBlockMeta.okeWorkerNodePrivateSubnetCidrBlock,
          sourceType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.TCP,
          tcpOptions: {
            min: 12250,
            max: 12250,
          },
          description: 'Kubernetes worker to control plane communication.',
        },
        {
          source: this.cidrBlockMeta.okeWorkerNodePrivateSubnetCidrBlock,
          sourceType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.ICMP,
          icmpOptions: {
            type: 3,
            code: 4,
          },
          description: 'Path Discovery.',
        },
        {
          source: this.cidrBlockMeta.okeBastionPrivateSubnetCidrBlock,
          sourceType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.TCP,
          tcpOptions: {
            min: 6443,
            max: 6443,
          },
          description: 'Bastion to Kubernetes API endpoint communication.',
        },
      ],
      egressSecurityRules: [
        {
          destination: this.allYnyServiceMeta.destination,
          destinationType: OciNetworkSourceType.SERVICE_CIDR_BLOCK,
          protocol: OciNetworkProtocol.TCP,
          description:
            'Allow Kubernetes control plane to communicate with OKE.',
        },
        {
          destination: this.allYnyServiceMeta.destination,
          destinationType: OciNetworkSourceType.SERVICE_CIDR_BLOCK,
          protocol: OciNetworkProtocol.ICMP,
          icmpOptions: {
            type: 3,
            code: 4,
          },
          description: 'Path Discovery.',
        },
        {
          destination: this.cidrBlockMeta.okeWorkerNodePrivateSubnetCidrBlock,
          destinationType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.TCP,
          description:
            'Allow Kubernetes control plane to communicate with worker nodes.',
        },
        {
          destination: this.cidrBlockMeta.okeWorkerNodePrivateSubnetCidrBlock,
          destinationType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.ICMP,
          icmpOptions: {
            type: 3,
            code: 4,
          },
          description: 'Path Discovery.',
        },
      ],
    }),
  );
  okeK8sEndpointPrivateSubnet = this.provide(
    CoreSubnet,
    'okeK8sEndpointPrivateSubnet',
    id => ({
      cidrBlock: this.cidrBlockMeta.okeK8sEndpointPrivateSubnetCidrBlock,
      compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
      displayName: id,
      vcnId: this.okeVcn.element.id,
      prohibitPublicIpOnVnic: true,
      routeTableId: this.okeK8sEndpointPrivateSubnetRouteTable.element.id,
      securityListIds: [
        this.okeK8sEndpointPrivateSubnetSecurityList.element.id,
      ],
      dnsLabel: 'endpoint',
    }),
  );

  // Worker Node Private Subnet
  okeWorkerNodePrivateSubnetRouteTable = this.provide(
    CoreRouteTable,
    'okeWorkerNodePrivateSubnetRouteTable',
    id => ({
      compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
      displayName: id,
      vcnId: this.okeVcn.element.id,
      routeRules: [
        {
          destination: '0.0.0.0/0',
          destinationType: OciNetworkSourceType.CIDR_BLOCK,
          networkEntityId: this.okeNatGateway.element.id,
        },
        {
          destination: this.allYnyServiceMeta.destination,
          destinationType: OciNetworkSourceType.SERVICE_CIDR_BLOCK,
          networkEntityId: this.okeServiceGateway.element.id,
        },
      ],
    }),
  );
  okeWorkerNodePrivateSubnetSecurityList = this.provide(
    CoreSecurityList,
    'okeWorkerNodePrivateSubnetSecurityList',
    id => ({
      compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
      displayName: id,
      vcnId: this.okeVcn.element.id,
      ingressSecurityRules: [
        {
          source: this.cidrBlockMeta.okeWorkerNodePrivateSubnetCidrBlock,
          sourceType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.ALL,
          description:
            'Allow pods on one worker node to communicate with pods on other worker nodes.',
        },
        {
          source: this.cidrBlockMeta.okeK8sEndpointPrivateSubnetCidrBlock,
          sourceType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.TCP,
          description:
            'Allow Kubernetes control plane to communicate with worker nodes.',
        },
        {
          source: '0.0.0.0/0',
          sourceType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.ICMP,
          icmpOptions: {
            type: 3,
            code: 4,
          },
          description: 'Path Discovery.',
        },
        {
          source: this.cidrBlockMeta.okeBastionPrivateSubnetCidrBlock,
          sourceType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.TCP,
          tcpOptions: {
            min: 22,
            max: 22,
          },
          description: 'Allow inbound SSH traffic to managed nodes.',
        },

        {
          source:
            this.cidrBlockMeta.okeServiceLoadBalancerPublicSubnetCidrBlock,
          sourceType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.TCP,
          tcpOptions: {
            min: 10256,
            max: 10256,
          },
          description:
            'Allow inbound TCP health check traffic from the load balancer public subnet.',
        },
        {
          source:
            this.cidrBlockMeta.okeServiceLoadBalancerPublicSubnetCidrBlock,
          sourceType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.UDP,
          udpOptions: {
            min: 30000,
            max: 32767,
          },
          description:
            'Allow all inbound node port traffic from the load balancer public subnet.',
        },
        {
          source:
            this.cidrBlockMeta.okeServiceLoadBalancerPublicSubnetCidrBlock,
          sourceType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.TCP,
          tcpOptions: {
            min: 30000,
            max: 32767,
          },
          description:
            'Allow all inbound node port traffic from the load balancer public subnet.',
        },
      ],
      egressSecurityRules: [
        {
          destination: this.cidrBlockMeta.okeWorkerNodePrivateSubnetCidrBlock,
          destinationType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.ALL,
          description:
            'Allow pods on one worker node to communicate with pods on other worker nodes.',
        },
        {
          destination: this.allYnyServiceMeta.destination,
          destinationType: OciNetworkSourceType.SERVICE_CIDR_BLOCK,
          protocol: OciNetworkProtocol.TCP,
          description: 'Allow worker nodes to communicate with OKE.',
        },
        {
          destination: this.cidrBlockMeta.okeK8sEndpointPrivateSubnetCidrBlock,
          destinationType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.TCP,
          tcpOptions: {
            min: 6443,
            max: 6443,
          },
          description:
            'Kubernetes worker to Kubernetes API endpoint communication.',
        },
        {
          destination: this.cidrBlockMeta.okeK8sEndpointPrivateSubnetCidrBlock,
          destinationType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.TCP,
          tcpOptions: {
            min: 12250,
            max: 12250,
          },
          description: 'Kubernetes worker to control plane communication.',
        },
        {
          destination: '0.0.0.0/0',
          destinationType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.TCP,
          description: 'Allow worker nodes to communicate with the internet.',
        },

        ...[
          this.globalConfigService.config.terraform.externalIpCidrBlocks
            .apexCaptainHomeIpv4,
        ]
          .map(eachL2tpVpnServerCidrBlock => {
            return [
              1701,
              // 500,
              // 4500
            ].map(eachPort => ({
              destination: eachL2tpVpnServerCidrBlock,
              destinationType: OciNetworkSourceType.CIDR_BLOCK,
              protocol: OciNetworkProtocol.UDP,
              udpOptions: {
                min: eachPort,
                max: eachPort,
              },
              description: `Allow egress traffic for L2TP VPN on UDP port ${eachPort} of ${eachL2tpVpnServerCidrBlock}`,
            }));
          })
          .flat(),
      ],
    }),
  );
  okeWorkerNodePrivateSubnet = this.provide(
    CoreSubnet,
    'okeWorkerNodePrivateSubnet',
    id => ({
      cidrBlock: this.cidrBlockMeta.okeWorkerNodePrivateSubnetCidrBlock,
      compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
      displayName: id,
      vcnId: this.okeVcn.element.id,
      prohibitPublicIpOnVnic: true,
      routeTableId: this.okeWorkerNodePrivateSubnetRouteTable.element.id,
      securityListIds: [this.okeWorkerNodePrivateSubnetSecurityList.element.id],
      dnsLabel: 'worker',
    }),
  );

  // Load Balancer Public Subnet
  okeServiceLoadBalancerPublicSubnetRouteTable = this.provide(
    CoreRouteTable,
    'okeServiceLoadBalancerPublicSubnetRouteTable',
    id => ({
      compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
      displayName: id,
      vcnId: this.okeVcn.element.id,
      routeRules: [
        {
          destination: '0.0.0.0/0',
          destinationType: OciNetworkSourceType.CIDR_BLOCK,
          networkEntityId: this.okeInternetGateway.element.id,
        },
      ],
    }),
  );
  okeServiceLoadBalancerPublicSubnetSecurityList = this.provide(
    CoreSecurityList,
    'okeServiceLoadBalancerPublicSubnetSecurityList',
    id => ({
      compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
      displayName: id,
      vcnId: this.okeVcn.element.id,
      ingressSecurityRules: [
        ...Object.values(this.loadbalancerPortMappings)
          .map(eachLbPortMapping =>
            eachLbPortMapping.sourceCidrBlocks.map(eachSourceCidrBlock => ({
              source: eachSourceCidrBlock,
              sourceType: OciNetworkSourceType.CIDR_BLOCK,
              protocol: eachLbPortMapping.protocol,
              stateless: false,
              description: eachLbPortMapping.description,
              tcpOptions:
                eachLbPortMapping.protocol == OciNetworkProtocol.TCP
                  ? {
                      min: eachLbPortMapping.inbound,
                      max: eachLbPortMapping.inbound,
                    }
                  : undefined,
              udpOptions:
                eachLbPortMapping.protocol == OciNetworkProtocol.UDP
                  ? {
                      min: eachLbPortMapping.inbound,
                      max: eachLbPortMapping.inbound,
                    }
                  : undefined,
            })),
          )
          .flat(),
      ],
      egressSecurityRules: [
        {
          destination: this.cidrBlockMeta.okeWorkerNodePrivateSubnetCidrBlock,
          destinationType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.TCP,
          description:
            'Allow outbound TCP health check traffic to the worker node private subnet.',
          tcpOptions: {
            min: 10256,
            max: 10256,
          },
        },
        {
          destination: this.cidrBlockMeta.okeWorkerNodePrivateSubnetCidrBlock,
          destinationType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.UDP,
          description:
            'Allow all outbound UDP node port traffic to the worker node private subnet.',
          udpOptions: {
            min: 30000,
            max: 32767,
          },
        },
        {
          destination: this.cidrBlockMeta.okeWorkerNodePrivateSubnetCidrBlock,
          destinationType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.TCP,
          description:
            'Allow all outbound TCP node port traffic to the worker node private subnet.',
          tcpOptions: {
            min: 30000,
            max: 32767,
          },
        },
      ],
    }),
  );
  okeServiceLoadBalancerPublicSubnet = this.provide(
    CoreSubnet,
    'okeServiceLoadBalancerPublicSubnet',
    id => ({
      cidrBlock: this.cidrBlockMeta.okeServiceLoadBalancerPublicSubnetCidrBlock,
      compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
      displayName: id,
      vcnId: this.okeVcn.element.id,
      routeTableId:
        this.okeServiceLoadBalancerPublicSubnetRouteTable.element.id,
      securityListIds: [
        this.okeServiceLoadBalancerPublicSubnetSecurityList.element.id,
      ],
      dnsLabel: 'lb',
    }),
  );

  // Bastion Private Subnet
  okeBastionPrivateSubnetSecurityList = this.provide(
    CoreSecurityList,
    'okeBastionPrivateSubnetSecurityList',
    id => ({
      compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
      displayName: id,
      vcnId: this.okeVcn.element.id,
      egressSecurityRules: [
        {
          destination: this.cidrBlockMeta.okeK8sEndpointPrivateSubnetCidrBlock,
          destinationType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.TCP,
          tcpOptions: {
            min: 6443,
            max: 6443,
          },
          description: 'Allow bastion to access the Kubernetes API endpoint.',
        },
        {
          destination: this.cidrBlockMeta.okeWorkerNodePrivateSubnetCidrBlock,
          destinationType: OciNetworkSourceType.CIDR_BLOCK,
          protocol: OciNetworkProtocol.TCP,
          tcpOptions: {
            min: 22,
            max: 22,
          },
          description: 'Allow SSH traffic to worker nodes.',
        },
      ],
    }),
  );
  okeBastionPrivateSubnet = this.provide(
    CoreSubnet,
    'okeBastionPrivateSubnet',
    id => ({
      cidrBlock: this.cidrBlockMeta.okeBastionPrivateSubnetCidrBlock,
      compartmentId: this.k8sOkeCompartmentStack.okeCompartment.element.id,
      displayName: id,
      vcnId: this.okeVcn.element.id,
      prohibitPublicIpOnVnic: true,
      securityListIds: [this.okeBastionPrivateSubnetSecurityList.element.id],
      dnsLabel: 'bastion',
    }),
  );

  constructor(
    // Global
    private readonly globalConfigService: GlobalConfigService,

    // Terraform
    private readonly terraformAppService: TerraformAppService,
    private readonly terraformConfigService: TerraformConfigService,

    // Stacks
    private readonly k8sOkeCompartmentStack: K8S_Oke_Compartment_Stack,
  ) {
    super(
      terraformAppService.cdktfApp,
      K8S_Oke_Network_Stack.name,
      'K8S OKE network stack',
    );
  }
}
