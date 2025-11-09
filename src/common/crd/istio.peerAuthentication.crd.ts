import { Construct } from 'constructs';
import {
  Manifest,
  ManifestConfig,
} from '@lib/terraform/providers/kubernetes/manifest';

export class IstioPeerAuthentication extends Manifest {
  constructor(
    scope: Construct,
    id: string,
    props: {
      manifest: {
        metadata: {
          name: string;
          namespace?: string;
        };
        spec?: {
          mtls?: {
            mode?: 'UNSET' | 'DISABLE' | 'PERMISSIVE' | 'STRICT';
            clientCertificate?: string;
            privateKey?: string;
            caCertificates?: string;
          };
          selector?: {
            matchLabels?: Record<string, string>;
          };
          portLevelMtls?: Record<
            string,
            {
              mode?: 'UNSET' | 'DISABLE' | 'PERMISSIVE' | 'STRICT';
            }
          >;
        };
      };
    } & ManifestConfig,
  ) {
    super(scope, id, {
      ...props,
      manifest: {
        apiVersion: 'security.istio.io/v1beta1',
        kind: 'PeerAuthentication',
        metadata: props.manifest.metadata,
        spec: props.manifest.spec,
      },
    });
  }
}
