import { Construct } from 'constructs';
import {
  Manifest,
  ManifestConfig,
} from '@lib/terraform/providers/kubernetes/manifest';

export class IstioAuthorizationPolicy extends Manifest {
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
          selector?: {
            matchLabels?: Record<string, string>;
          };
          action?: 'ALLOW' | 'DENY' | 'AUDIT' | 'CUSTOM';
          rules?: {
            from?: {
              source?: {
                principals?: string[];
                notPrincipals?: string[];
                requestPrincipals?: string[];
                notRequestPrincipals?: string[];
                namespaces?: string[];
                notNamespaces?: string[];
                ipBlocks?: string[];
                notIpBlocks?: string[];
                remoteIpBlocks?: string[];
                notRemoteIpBlocks?: string[];
              }[];
            }[];
            to?: {
              operation?: {
                hosts?: string[];
                notHosts?: string[];
                ports?: string[];
                notPorts?: string[];
                methods?: string[];
                notMethods?: string[];
                paths?: string[];
                notPaths?: string[];
              };
            }[];
            when?: {
              key?: string;
              notKey?: string;
              values?: string[];
              notValues?: string[];
            }[];
          }[];
          provider?: {
            name?: string;
          };
        };
      };
    } & ManifestConfig,
  ) {
    super(scope, id, {
      ...props,
      manifest: {
        apiVersion: 'security.istio.io/v1',
        kind: 'AuthorizationPolicy',
        metadata: props.manifest.metadata,
        spec: props.manifest.spec,
      },
    });
  }
}
