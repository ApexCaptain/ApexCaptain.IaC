import { Construct } from 'constructs';
import {
  Manifest,
  ManifestConfig,
} from '@lib/terraform/providers/kubernetes/manifest';

export class Kiali extends Manifest {
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
          deployment?: {
            namespace?: string;
            verbose_mode?: string;
            view_only_mode?: boolean;
            accessible_namespaces?: string[];
            cluster_wide_access?: boolean;
            image_name?: string;
            image_version?: string;
            image_pull_policy?: string;
            image_pull_secrets?: { name: string }[];
            ingress?: {
              enabled?: boolean;
              ingress_class_name?: string;
              override_yaml?: Record<string, any>;
            };
            node_selector?: Record<string, string>;
            tolerations?: {
              key?: string;
              operator?: 'Equal' | 'Exists';
              value?: string;
              effect?: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';
              tolerationSeconds?: number;
            }[];
            resources?: {
              requests?: {
                cpu?: string;
                memory?: string;
              };
              limits?: {
                cpu?: string;
                memory?: string;
              };
            };
            replicas?: number;
            service_type?: string;
            service_annotations?: Record<string, string>;
            pod_annotations?: Record<string, string>;
            pod_labels?: Record<string, string>;
            priority_class_name?: string;
            affinity?: Record<string, any>;
            hpa?: {
              api_version?: string;
              spec?: Record<string, any>;
            };
            pdb?: {
              api_version?: string;
              spec?: Record<string, any>;
            };
            container_name?: string;
            container_port?: number;
            service_account_name?: string;
            runtime_class_name?: string;
            security_context?: Record<string, any>;
            custom_secrets?: {
              name: string;
              mount: string;
              optional?: boolean;
            }[];
            custom_config_map?: {
              name: string;
              mount: string;
              optional?: boolean;
            };
            logger?: {
              log_format?: string;
              log_level?: string;
              time_format?: string;
            };
            proxy?: {
              resources?: {
                requests?: {
                  cpu?: string;
                  memory?: string;
                };
                limits?: {
                  cpu?: string;
                  memory?: string;
                };
              };
            };
            health_check_url?: string;
            readiness_failure_threshold?: number;
            readiness_initial_delay?: number;
            readiness_period_seconds?: number;
            liveness_failure_threshold?: number;
            liveness_initial_delay?: number;
            liveness_period_seconds?: number;
            termination_grace_period_seconds?: number;
            update_strategy?: Record<string, any>;
            additional_service_yaml?: Record<string, any>;
            additional_deployment_yaml?: Record<string, any>;
          };
          auth?: {
            strategy?: 'anonymous' | 'token' | 'openshift' | 'ldap' | 'header';
            openid?: {
              client_id?: string;
              client_secret?: string;
              issuer_uri?: string;
              username_claim?: string;
              insecure_skip_verify_tls?: boolean;
              scopes?: string[];
              additional_request_params?: Record<string, string>;
              authentication_timeout?: number;
              logout_redirect_url?: string;
              use_rpt?: boolean;
              disable_rbac?: boolean;
            };
            openshift?: {
              client_id?: string;
              client_secret?: string;
              issuer_uri?: string;
              username_claim?: string;
              insecure_skip_verify_tls?: boolean;
              scopes?: string[];
              authentication_timeout?: number;
              logout_redirect_url?: string;
              use_rpt?: boolean;
              disable_rbac?: boolean;
            };
            ldap?: {
              ldap_url?: string;
              ldap_user?: string;
              ldap_password?: string;
              ldap_use_starttls?: boolean;
              ldap_insecure_skip_verify?: boolean;
              ldap_ca?: string;
              ldap_attributes?: {
                username?: string[];
                uid?: string[];
                mail?: string[];
                member_of?: string[];
              };
              ldap_filter?: string;
              ldap_group_filter?: string;
            };
            header?: {
              user_header?: string;
              group_header?: string;
            };
            session_expiration_seconds?: number;
            signing_key?: string;
          };
          server?: {
            address?: string;
            port?: number;
            web_root?: string;
            web_fqdn?: string;
            web_schema?: 'http' | 'https' | '';
            web_port?: string;
            web_history_mode?: 'browser' | 'hash';
            gzip_enabled?: boolean;
            metrics_enabled?: boolean;
            metrics_port?: number;
            cors_allow_all?: boolean;
            audit_log?: boolean;
            require_auth?: boolean;
            node_port?: number;
            write_timeout?: string | number;
            profiler?: {
              enabled?: boolean;
            };
            observability?: {
              metrics?: {
                enabled?: boolean;
                port?: number;
              };
              tracing?: {
                enabled?: boolean;
                collector_type?: 'otel';
                collector_url?: string;
                sampling_rate?: number;
                otel?: {
                  protocol?: 'http' | 'https' | 'grpc';
                  tls_enabled?: boolean;
                  skip_verify?: boolean;
                  ca_name?: string;
                };
              };
            };
          };
          external_services?: {
            prometheus?: {
              url?: string;
              auth?: {
                type?: 'none' | 'bearer' | 'basic';
                token?: string;
                username?: string;
                password?: string;
                ca_file?: string;
                insecure_skip_verify?: boolean;
                use_kiali_token?: boolean;
              };
              custom_headers?: Record<string, string>;
              thanos_proxy?: {
                enabled?: boolean;
                retention_period?: string;
                scrape_interval?: string;
              };
              cache_duration?: number;
              cache_enabled?: boolean;
              cache_expiration?: number;
              health_check_url?: string;
              is_core?: boolean;
              query_scope?: Record<string, string>;
            };
            grafana?: {
              enabled?: boolean;
              in_cluster_url?: string;
              url?: string;
              internal_url?: string;
              external_url?: string;
              auth?: {
                type?: 'none' | 'bearer' | 'basic';
                token?: string;
                username?: string;
                password?: string;
                ca_file?: string;
                insecure_skip_verify?: boolean;
                use_kiali_token?: boolean;
              };
              dashboards?: {
                name?: string;
                variables?: {
                  namespace?: string;
                  app?: string;
                  service?: string;
                  workload?: string;
                  version?: string;
                  datasource?: string;
                };
              }[];
              datasource_uid?: string;
              health_check_url?: string;
              is_core?: boolean;
            };
            tracing?: {
              enabled?: boolean;
              in_cluster_url?: string;
              url?: string;
              auth?: {
                type?: 'none' | 'bearer' | 'basic';
                token?: string;
                username?: string;
                password?: string;
                ca_file?: string;
                insecure_skip_verify?: boolean;
                use_kiali_token?: boolean;
              };
              namespace_selector?: boolean;
              white_list_istio_system?: string[];
              use_grpc?: boolean;
            };
            custom_dashboards?: {
              namespace_label?: string;
              prometheus?: {
                url?: string;
                auth?: {
                  type?: 'none' | 'bearer' | 'basic';
                  token?: string;
                  username?: string;
                  password?: string;
                  ca_file?: string;
                  insecure_skip_verify?: boolean;
                  use_kiali_token?: boolean;
                };
                custom_headers?: Record<string, string>;
                thanos_proxy?: {
                  enabled?: boolean;
                  retention_period?: string;
                  scrape_interval?: string;
                };
                cache_duration?: number;
                cache_enabled?: boolean;
                cache_expiration?: number;
                health_check_url?: string;
                is_core?: boolean;
                query_scope?: Record<string, string>;
              };
            };
          };
          istio?: {
            config_map_name?: string;
            root_namespace?: string;
            url_service_version?: string;
            istio_identity_domain?: string;
            istio_injection_annotation?: string;
            istio_sidecar_annotation?: string;
            istio_sidecar_injector_config_map_name?: string;
            istiod_deployment_name?: string;
            istiod_pod_monitoring_port?: number;
            istiod_polling_interval_seconds?: number;
            istio_api_enabled?: boolean;
            istio_canary_revision?: {
              current?: string;
              upgrade?: string;
            };
            egress_gateway_namespace?: string;
            gateway_api_class_name?: string;
            gateway_api_classes?: {
              name?: string;
              class_name?: string;
            }[];
            gateway_api_classes_label_selector?: string;
            envoy_admin_local_port?: number;
            validation_change_detection_enabled?: boolean;
            validation_reconcile_interval?: string;
            component_status?: {
              enabled?: boolean;
              components?: {
                app_label?: string;
                is_core?: boolean;
                is_multicluster?: boolean;
                is_proxy?: boolean;
                namespace?: string;
              }[];
            };
          };
          kubernetes_config?: {
            burst?: number;
            qps?: number;
            cache_duration?: number;
            cache_token_namespace_duration?: number;
            cluster_name?: string;
            excluded_workloads?: string[];
          };
          login_token?: {
            expiration_seconds?: number;
            signing_key?: string;
          };
          version?: string;
          [key: string]: any; // Allow additional fields
        };
      };
    } & ManifestConfig,
  ) {
    super(scope, id, {
      ...props,
      manifest: {
        apiVersion: 'kiali.io/v1alpha1',
        kind: 'Kiali',
        metadata: props.manifest.metadata,
        spec: props.manifest.spec,
      },
    });
  }
}
