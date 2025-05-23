/**  @see https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/core_security_list#protocol */
export enum OciNetworkProtocol {
  ALL = 'all',
  ICMP = '1',
  TCP = '6',
  UDP = '17',
  ESP = '50',
  ICMPv6 = '58',
}
