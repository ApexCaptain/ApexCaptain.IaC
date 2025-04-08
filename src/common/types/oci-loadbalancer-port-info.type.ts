import { OciNetworkProtocol } from '../enum/oci-network-protocol.enum';
export type OciLoadBalancerPortInfo = {
  sourceCidrBlocks: string[];
  inbound: number;
  protocol: OciNetworkProtocol;
  description: string;
};
