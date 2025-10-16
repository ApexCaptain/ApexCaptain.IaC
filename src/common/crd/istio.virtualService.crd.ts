import { Construct } from 'constructs';
import {
  Manifest,
  ManifestConfig,
} from '@lib/terraform/providers/kubernetes/manifest';

export class IstioVirtualService extends Manifest {
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
          hosts: string[];
          gateways: string[];
          http?: {
            route?: {
              destination: {
                host: string;
                port: {
                  number: number;
                };
              };
            }[];
            redirect?: {
              uri: string;
              authority: string;
            };
          }[];
          tls?: {
            match?: {
              port?: number;
              sniHosts?: string[];
            }[];
            route?: {
              destination: {
                host: string;
                port: {
                  number: number;
                };
              };
            }[];
          }[];
        };
      };
    } & ManifestConfig,
  ) {
    super(scope, id, {
      ...props,
      manifest: {
        apiVersion: 'networking.istio.io/v1alpha3',
        kind: 'VirtualService',
        metadata: props.manifest.metadata,
        spec: props.manifest.spec,
      },
    });
  }
}
