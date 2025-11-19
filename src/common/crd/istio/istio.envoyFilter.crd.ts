import { Construct } from 'constructs';
import {
  Manifest,
  ManifestConfig,
} from '@lib/terraform/providers/kubernetes/manifest';

export class IstioEnvoyFilter extends Manifest {
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
          workloadSelector?: {
            labels?: Record<string, string>;
          };
          configPatches?: {
            applyTo?:
              | 'INVALID'
              | 'LISTENER'
              | 'FILTER_CHAIN'
              | 'NETWORK_FILTER'
              | 'HTTP_FILTER'
              | 'ROUTE_CONFIGURATION'
              | 'VIRTUAL_HOST'
              | 'HTTP_ROUTE'
              | 'CLUSTER'
              | 'EXTENSION_CONFIG'
              | 'BOOTSTRAP'
              | 'LISTENER_FILTER'
              | 'CLUSTER_LOAD_ASSIGNMENT';
            match?: {
              context?:
                | 'ANY'
                | 'SIDECAR_INBOUND'
                | 'SIDECAR_OUTBOUND'
                | 'GATEWAY';
              listener?: {
                filterChain?: {
                  filter?: {
                    name?: string;
                    subFilter?: {
                      name?: string;
                    };
                  };
                };
                name?: string;
                portNumber?: number;
              };
              routeConfiguration?: {
                name?: string;
                vhost?: {
                  name?: string;
                  route?: {
                    name?: string;
                    action?: 'ANY' | 'ROUTE' | 'REDIRECT' | 'DIRECT_RESPONSE';
                  };
                };
              };
              cluster?: {
                name?: string;
                portNumber?: number;
                service?: string;
                subset?: string;
              };
            };
            patch?: {
              operation?: 'INVALID' | 'MERGE' | 'ADD' | 'REMOVE' | 'REPLACE';
              value?: Record<string, any>;
              filterClass?: 'UNSPECIFIED' | 'AUTHN' | 'AUTHZ' | 'STATS';
            };
          }[];
          priority?: number;
        };
      };
    } & ManifestConfig,
  ) {
    super(scope, id, {
      ...props,
      manifest: {
        apiVersion: 'networking.istio.io/v1alpha3',
        kind: 'EnvoyFilter',
        metadata: props.manifest.metadata,
        spec: props.manifest.spec,
      },
    });
  }
}
