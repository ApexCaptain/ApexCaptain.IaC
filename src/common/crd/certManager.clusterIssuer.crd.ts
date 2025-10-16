import { Construct } from 'constructs';
import {
  Manifest,
  ManifestConfig,
} from '@lib/terraform/providers/kubernetes/manifest';

export class CertManagerClusterIssuer extends Manifest {
  constructor(
    scope: Construct,
    id: string,
    props: {
      manifest: {
        metadata: {
          name: string;
        };
        spec: {
          acme?: {
            server: string;
            email: string;
            privateKeySecretRef: {
              name: string;
            };
            solvers?: {
              http01?: {
                ingress?: {
                  class?: string;
                };
              };
              dns01?: {
                cloudflare?: {
                  email: string;
                  apiTokenSecretRef: {
                    name: string;
                    key: string;
                  };
                };
              };
            }[];
          };
          ca?: {
            secretName: string;
          };
          selfSigned?: {};
          vault?: {
            server: string;
            path: string;
            auth: {
              kubernetes?: {
                mountPath: string;
                role: string;
                secretRef: {
                  name: string;
                  key: string;
                };
              };
              tokenSecretRef?: {
                name: string;
                key: string;
              };
            };
          };
          venafi?: {
            zone: string;
            tpp?: {
              url: string;
              credentialsRef: {
                name: string;
              };
              caBundle?: string;
            };
            cloud?: {
              url: string;
              apiTokenSecretRef: {
                name: string;
                key: string;
              };
            };
          };
        };
      };
    } & ManifestConfig,
  ) {
    super(scope, id, {
      ...props,
      manifest: {
        apiVersion: 'cert-manager.io/v1',
        kind: 'ClusterIssuer',
        metadata: props.manifest.metadata,
        spec: props.manifest.spec,
      },
    });
  }
}
