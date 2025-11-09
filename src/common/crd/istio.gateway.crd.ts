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
          selector: Record<string, string>;
          servers: {
            name?: string;
            bind?: string;
            defaultEndpoint?: string;
            port: {
              number: number;
              name: string;
              protocol: string;
              targetPort?: number;
            };
            hosts: string[];
            tls?: {
              mode?:
                | 'PASSTHROUGH'
                | 'SIMPLE'
                | 'MUTUAL'
                | 'AUTO_PASSTHROUGH'
                | 'ISTIO_MUTUAL'
                | 'OPTIONAL_MUTUAL';
              credentialName?: string;
              credentialNames?: string[];
              minProtocolVersion?:
                | 'TLS_AUTO'
                | 'TLSV1_0'
                | 'TLSV1_1'
                | 'TLSV1_2'
                | 'TLSV1_3';
              maxProtocolVersion?:
                | 'TLS_AUTO'
                | 'TLSV1_0'
                | 'TLSV1_1'
                | 'TLSV1_2'
                | 'TLSV1_3';
              caCertificates?: string;
              caCrl?: string;
              privateKey?: string;
              serverCertificate?: string;
              subjectAltNames?: string[];
              cipherSuites?: string[];
              httpsRedirect?: boolean;
              tlsCertificates?: {
                caCertificates?: string;
                privateKey?: string;
                serverCertificate?: string;
              }[];
              verifyCertificateHash?: string[];
              verifyCertificateSpki?: string[];
            };
          }[];
        };
      };
    } & ManifestConfig,
  ) {
    super(scope, id, {
      ...props,
      manifest: {
        apiVersion: 'networking.istio.io/v1beta1',
        kind: 'Gateway',
        metadata: props.manifest.metadata,
        spec: props.manifest.spec,
      },
    });
  }
}
