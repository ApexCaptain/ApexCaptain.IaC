import { Manifest } from '@lib/terraform/providers/kubernetes/manifest';
import { Construct } from 'constructs';

export const CERT_MANAGER_ACME_SERVER = {
  PRODUCTION: 'https://acme-v02.api.letsencrypt.org/directory',
  STAGING: 'https://acme-staging-v02.api.letsencrypt.org/directory',
} as const;

export type CertManagerClusterIssuerProps = {
  metadata: {
    name: string;
  };
  spec: {
    acme: {
      server: (typeof CERT_MANAGER_ACME_SERVER)[keyof typeof CERT_MANAGER_ACME_SERVER];
      email: string;
      privateKeySecretRef: {
        name: string;
      };
      solvers: {
        dns01: {
          cloudflare: {
            email: string;
            apiTokenSecretRef: {
              name: string;
              key: string;
            };
          };
        };
      }[];
    };
  };
};

export class CertManagerClusterIssuer extends Manifest {
  constructor(
    scope: Construct,
    id: string,
    props: CertManagerClusterIssuerProps,
  ) {
    super(scope, id, {
      manifest: {
        apiVersion: 'cert-manager.io/v1',
        kind: 'ClusterIssuer',
        metadata: props.metadata,
        spec: props.spec,
      },
    });
  }
}
