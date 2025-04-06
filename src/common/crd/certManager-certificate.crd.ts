import { Manifest } from '@lib/terraform/providers/kubernetes/manifest';
import { Construct } from 'constructs';

export type CertManagerCertificateProps = {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    secretName: string;
    issuerRef: {
      name: string;
      kind: 'ClusterIssuer';
    };
    commonName?: string;
    dnsNames: string[];
    duration?: string;
    renewBefore?: string;
  };
};

export class CertManagerCertificate extends Manifest {
  constructor(
    scope: Construct,
    id: string,
    props: CertManagerCertificateProps,
  ) {
    super(scope, id, {
      manifest: {
        apiVersion: 'cert-manager.io/v1',
        kind: 'Certificate',
        metadata: props.metadata,
        spec: props.spec,
      },
    });
  }
}
