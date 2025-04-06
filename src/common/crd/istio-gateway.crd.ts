import { Manifest } from '@lib/terraform/providers/kubernetes/manifest';
import { Construct } from 'constructs';

export class IstioGateway extends Manifest {
  constructor(
    scope: Construct,
    id: string,
    props: {
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
            credentialName: string;
          };
        }[];
      };
    },
  ) {
    super(scope, id, {
      manifest: {
        apiVersion: 'networking.istio.io/v1alpha3',
        kind: 'Gateway',
        metadata: props.metadata,
        spec: props.spec,
      },
    });
  }
}
