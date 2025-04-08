import { OciLoadBalancerPortInfo } from '../types';
import { OciNetworkProtocol } from '../enum/oci-network-protocol.enum';

export function createLoadBalancerPortInfo(
  options: Partial<OciLoadBalancerPortInfo>,
): OciLoadBalancerPortInfo {
  options.sourceCidrBlocks = options.sourceCidrBlocks ?? ['0.0.0.0/0'];
  options.protocol = options.protocol ?? OciNetworkProtocol.TCP;
  const protocolString = Object.entries(OciNetworkProtocol)
    .filter(([__, value]) => options.protocol!!.includes(value))
    .map(([key]) => key)
    .join(', ');
  options.description =
    options.description ??
    `Traffic from the [${options.sourceCidrBlocks.join(', ')}] CIDR block on inbound port ${options.inbound} for [${protocolString}].`;
  return options as OciLoadBalancerPortInfo;
}
