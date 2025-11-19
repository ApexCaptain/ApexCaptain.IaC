import { Construct } from 'constructs';
import {
  Manifest,
  ManifestConfig,
} from '@lib/terraform/providers/kubernetes/manifest';

export class MonitoringServiceMonitor extends Manifest {
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
          selector: {
            matchLabels?: Record<string, string>;
            matchExpressions?: {
              key: string;
              operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist';
              values?: string[];
            }[];
          };
          endpoints: {
            port?: string | number;
            targetPort?: string | number;
            path?: string;
            scheme?: 'http' | 'https';
            interval?: string;
            scrapeTimeout?: string;
            honorLabels?: boolean;
            honorTimestamps?: boolean;
            followRedirects?: boolean;
            enableHttp2?: boolean;
            filterRunning?: boolean;
            metricRelabelings?: {
              sourceLabels?: string[];
              separator?: string;
              targetLabel?: string;
              regex?: string;
              modulus?: number;
              replacement?: string;
              action?:
                | 'replace'
                | 'Replace'
                | 'keep'
                | 'Keep'
                | 'drop'
                | 'Drop'
                | 'hashmod'
                | 'HashMod'
                | 'labelmap'
                | 'LabelMap'
                | 'labeldrop'
                | 'LabelDrop'
                | 'labelkeep'
                | 'LabelKeep'
                | 'lowercase'
                | 'Lowercase'
                | 'uppercase'
                | 'Uppercase'
                | 'keepequal'
                | 'KeepEqual'
                | 'dropequal'
                | 'DropEqual';
            }[];
            relabelings?: {
              sourceLabels?: string[];
              separator?: string;
              targetLabel?: string;
              regex?: string;
              modulus?: number;
              replacement?: string;
              action?:
                | 'replace'
                | 'Replace'
                | 'keep'
                | 'Keep'
                | 'drop'
                | 'Drop'
                | 'hashmod'
                | 'HashMod'
                | 'labelmap'
                | 'LabelMap'
                | 'labeldrop'
                | 'LabelDrop'
                | 'labelkeep'
                | 'LabelKeep'
                | 'lowercase'
                | 'Lowercase'
                | 'uppercase'
                | 'Uppercase'
                | 'keepequal'
                | 'KeepEqual'
                | 'dropequal'
                | 'DropEqual';
            }[];
            tlsConfig?: {
              ca?: {
                configMap?: {
                  name: string;
                  key: string;
                  optional?: boolean;
                };
                secret?: {
                  name: string;
                  key: string;
                  optional?: boolean;
                };
              };
              cert?: {
                configMap?: {
                  name: string;
                  key: string;
                  optional?: boolean;
                };
                secret?: {
                  name: string;
                  key: string;
                  optional?: boolean;
                };
              };
              keySecret?: {
                name: string;
                key: string;
                optional?: boolean;
              };
              insecureSkipVerify?: boolean;
              serverName?: string;
            };
            basicAuth?: {
              username?: {
                name: string;
                key: string;
                optional?: boolean;
              };
              password?: {
                name: string;
                key: string;
                optional?: boolean;
              };
            };
            authorization?: {
              type?: string;
              credentials?: {
                name: string;
                key: string;
                optional?: boolean;
              };
            };
            oauth2?: {
              clientId?: {
                configMap?: {
                  name: string;
                  key: string;
                  optional?: boolean;
                };
                secret?: {
                  name: string;
                  key: string;
                  optional?: boolean;
                };
              };
              clientSecret?: {
                name: string;
                key: string;
                optional?: boolean;
              };
              tokenUrl: string;
              scopes?: string[];
              endpointParams?: Record<string, string>;
            };
            bearerTokenFile?: string;
            bearerTokenSecret?: {
              name: string;
              key: string;
              optional?: boolean;
            };
          }[];
          namespaceSelector?: {
            matchNames?: string[];
            any?: boolean;
          };
          podTargetLabels?: string[];
          sampleLimit?: number;
          targetLimit?: number;
          jobLabel?: string;
          scrapeClass?: string;
          targetLabels?: string[];
        };
      };
    } & ManifestConfig,
  ) {
    super(scope, id, {
      ...props,
      manifest: {
        apiVersion: 'monitoring.coreos.com/v1',
        kind: 'ServiceMonitor',
        metadata: props.manifest.metadata,
        spec: props.manifest.spec,
      },
    });
  }
}
