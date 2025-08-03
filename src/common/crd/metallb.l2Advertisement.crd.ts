import {
  Manifest,
  ManifestConfig,
} from '@lib/terraform/providers/kubernetes/manifest';
import { Construct } from 'constructs';

export class MetallbL2Advertisement extends Manifest {
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
          ipAddressPools?: string[];
          ipAddressPoolSelectors?: {
            matchLabels?: Record<string, string>;
            matchExpressions?: {
              key: string;
              operator: string;
              values?: string[];
            }[];
          }[];
          nodeSelectors?: {
            matchLabels?: Record<string, string>;
            matchExpressions?: {
              key: string;
              operator: string;
              values?: string[];
            }[];
          }[];
          interfaces?: string[];
        };
      };
    } & ManifestConfig,
  ) {
    super(scope, id, {
      ...props,
      manifest: {
        apiVersion: 'metallb.io/v1beta1',
        kind: 'L2Advertisement',
        metadata: props.manifest.metadata,
        spec: props.manifest.spec,
      },
    });
  }
}
