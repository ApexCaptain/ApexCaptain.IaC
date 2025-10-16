import { Construct } from 'constructs';
import {
  Manifest,
  ManifestConfig,
} from '@lib/terraform/providers/kubernetes/manifest';

export class IstioGateway extends Manifest {
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
          selector: {
            istio: string;
          };
          servers: {
            port: {
              number: number;
              name: string;
              protocol: string;
            };
            hosts: string[];
            tls?: {
              mode: string;
              credentialName?: string;
            };
          }[];
        };
      };
    } & ManifestConfig,
  ) {
    super(scope, id, {
      ...props,
      manifest: {
        apiVersion: 'networking.istio.io/v1alpha3',
        kind: 'Gateway',
        metadata: props.manifest.metadata,
        spec: props.manifest.spec,
      },
    });
  }
}
