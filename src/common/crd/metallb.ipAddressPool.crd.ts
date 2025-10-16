import { Construct } from 'constructs';
import {
  Manifest,
  ManifestConfig,
} from '@lib/terraform/providers/kubernetes/manifest';
export class MetallbIpAddressPool extends Manifest {
  constructor(
    scope: Construct,
    id: string,
    props: {
      manifest: {
        metadata: {
          name: string;
          namespace: string;
        };
        spec: {
          addresses: string[];
          autoAssign?: boolean;
          avoidBuggyIPs?: boolean;
          serviceAllocation?: {
            namespaces?: string[];
            namespaceSelectors?: {
              matchLabels?: Record<string, string>;
              matchExpressions?: {
                key: string;
                operator: string;
                values?: string[];
              }[];
            }[];
            serviceSelectors?: {
              matchLabels?: Record<string, string>;
              matchExpressions?: {
                key: string;
                operator: string;
                values?: string[];
              }[];
            }[];
          };
        };
      };
    } & ManifestConfig,
  ) {
    super(scope, id, {
      ...props,
      manifest: {
        apiVersion: 'metallb.io/v1beta1',
        kind: 'IPAddressPool',
        metadata: props.manifest.metadata,
        spec: props.manifest.spec,
      },
    });
  }
}
