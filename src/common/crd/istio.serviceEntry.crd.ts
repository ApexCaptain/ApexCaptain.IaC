import {
  Manifest,
  ManifestConfig,
} from '@lib/terraform/providers/kubernetes/manifest';
import { Construct } from 'constructs';

export class IstioServiceEntry extends Manifest {
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
          addresses?: string[];
          ports: {
            number: number;
            name: string;
            protocol: string;
          }[];
          location?: 'MESH_EXTERNAL' | 'MESH_INTERNAL';
          resolution?: 'NONE' | 'STATIC' | 'DNS';
          endpoints?: {
            address: string;
            ports?: { [key: string]: number };
            locality?: string;
            labels?: { [key: string]: string };
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
        kind: 'ServiceEntry',
        metadata: props.manifest.metadata,
        spec: props.manifest.spec,
      },
    });
  }
}
