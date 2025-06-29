import { Manifest } from '@lib/terraform/providers/kubernetes/manifest';
import { Construct } from 'constructs';

export class IstioVirtualService extends Manifest {
  constructor(
    scope: Construct,
    id: string,
    props: {
      metadata: {
        name: string;
        namespace: string;
      };
      spec: {
        hosts: string[];
        gateways: string[];
        http: {
          route: {
            destination: {
              host: string;
              port: {
                number: number;
              };
            };
          }[];
        }[];
      };
    },
  ) {
    super(scope, id, {
      manifest: {
        apiVersion: 'networking.istio.io/v1alpha3',
        kind: 'VirtualService',
        metadata: props.metadata,
        spec: props.spec,
      },
    });
  }
}
