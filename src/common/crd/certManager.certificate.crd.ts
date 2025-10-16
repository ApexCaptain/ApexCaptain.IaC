import { Construct } from 'constructs';
import {
  Manifest,
  ManifestConfig,
} from '@lib/terraform/providers/kubernetes/manifest';

export class CertManagerCertificate extends Manifest {
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
          secretName: string;
          issuerRef: {
            name: string;
            kind: string;
            group?: string;
          };
          dnsNames?: string[];
          commonName?: string;
          subject?: {
            countries?: string[];
            provinces?: string[];
            localities?: string[];
            organizationalUnits?: string[];
            organizations?: string[];
            streetAddresses?: string[];
            postalCodes?: string[];
            serialNumber?: string;
          };
          usages?: string[];
          keySize?: number;
          keyAlgorithm?: string;
          keyEncoding?: string;
          duration?: string;
          renewBefore?: string;
          isCA?: boolean;
          secretTemplate?: {
            annotations?: Record<string, string>;
            labels?: Record<string, string>;
          };
          additionalOutputFormats?: {
            type: string;
            key?: {
              secretName: string;
              key: string;
            };
          }[];
        };
      };
    } & ManifestConfig,
  ) {
    super(scope, id, {
      ...props,
      manifest: {
        apiVersion: 'cert-manager.io/v1',
        kind: 'Certificate',
        metadata: props.manifest.metadata,
        spec: props.manifest.spec,
      },
    });
  }
}
