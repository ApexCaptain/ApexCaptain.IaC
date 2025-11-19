import { Construct } from 'constructs';
import {
  Manifest,
  ManifestConfig,
} from '@lib/terraform/providers/kubernetes/manifest';

export class IstioDestinationRule extends Manifest {
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
          host: string;
          trafficPolicy?: {
            tls?: {
              mode?: 'DISABLE' | 'SIMPLE' | 'MUTUAL' | 'ISTIO_MUTUAL';
              clientCertificate?: string;
              privateKey?: string;
              caCertificates?: string;
              sni?: string;
              subjectAltNames?: string[];
            };
          };
          subsets?: {
            name: string;
            labels?: { [key: string]: string };
            trafficPolicy?: {
              tls?: {
                mode?: 'DISABLE' | 'SIMPLE' | 'MUTUAL' | 'ISTIO_MUTUAL';
                clientCertificate?: string;
                privateKey?: string;
                caCertificates?: string;
                sni?: string;
                subjectAltNames?: string[];
              };
            };
          }[];
          exportTo?: string[];
        };
      };
    } & ManifestConfig,
  ) {
    super(scope, id, {
      ...props,
      manifest: {
        apiVersion: 'networking.istio.io/v1alpha3',
        kind: 'DestinationRule',
        metadata: props.manifest.metadata,
        spec: props.manifest.spec,
      },
    });
  }
}
