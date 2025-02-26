/** @see https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/core_network_security_group_security_rule#source_type */
export enum OciNetworkSourceType {
  CIDR_BLOCK = 'CIDR_BLOCK',
  SERVICE_CIDR_BLOCK = 'SERVICE_CIDR_BLOCK',
  NETWORK_SECURITY_GROUP = 'NETWORK_SECURITY_GROUP',
}
