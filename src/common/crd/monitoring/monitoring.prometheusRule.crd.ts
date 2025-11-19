import { Construct } from 'constructs';
import {
  Manifest,
  ManifestConfig,
} from '@lib/terraform/providers/kubernetes/manifest';

export class MonitoringPrometheusRule extends Manifest {
  constructor(
    scope: Construct,
    id: string,
    props: {
      manifest: {
        metadata: {
          name: string;
          namespace: string;
          labels?: Record<string, string>;
          annotations?: Record<string, string>;
        };
        spec: {
          groups: {
            name: string;
            interval?: string;
            limit?: number;
            partial_response_strategy?: 'abort' | 'warn';
            query_offset?: string;
            labels?: Record<string, string>;
            rules: {
              alert?: string;
              record?: string;
              expr: string | number;
              for?: string;
              keep_firing_for?: string;
              labels?: Record<string, string>;
              annotations?: Record<string, string>;
            }[];
          }[];
        };
      };
    } & ManifestConfig,
  ) {
    super(scope, id, {
      ...props,
      manifest: {
        apiVersion: 'monitoring.coreos.com/v1',
        kind: 'PrometheusRule',
        metadata: props.manifest.metadata,
        spec: props.manifest.spec,
      },
    });
  }
}
