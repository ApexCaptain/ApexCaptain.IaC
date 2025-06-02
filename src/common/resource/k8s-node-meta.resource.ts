import { Resource } from '@lib/terraform/providers/null/resource';
import { Fn, LocalExecProvisioner } from 'cdktf';
import { Construct } from 'constructs';

export interface K8sNodeMetaConfig {
  nodeName: string;
  labels?: {
    key: string;
    value: string;
    present: boolean;
  }[];
  annotations?: {
    key: string;
    value: string;
    present: boolean;
  }[];
  kubeconfigPath?: string;
}

export class K8sNodeMeta extends Resource {
  constructor(scope: Construct, id: string, config: K8sNodeMetaConfig) {
    const isLabelKeyConflict =
      config.labels !== undefined &&
      config.labels?.length !==
        new Set(config.labels?.map(label => label.key)).size;
    if (isLabelKeyConflict) {
      throw new Error('Label key conflict');
    }
    const isAnnotationKeyConflict =
      config.annotations !== undefined &&
      config.annotations?.length !==
        new Set(config.annotations?.map(annotation => annotation.key)).size;
    if (isAnnotationKeyConflict) {
      throw new Error('Annotation key conflict');
    }

    const doesResourceExist =
      (config.labels ?? []).length + (config.annotations ?? []).length > 0;

    super(scope, id, {
      triggers: {
        config: Fn.sha256(Fn.jsonencode(config)),
      },
      provisioners: doesResourceExist
        ? [
            ...(config.labels?.map<LocalExecProvisioner>(
              ({ key, value, present }) => ({
                type: 'local-exec',
                command: present
                  ? `kubectl ${config.kubeconfigPath ? `--kubeconfig=${config.kubeconfigPath}` : ''} label node ${config.nodeName} ${key}=${value} --overwrite`
                  : `kubectl ${config.kubeconfigPath ? `--kubeconfig=${config.kubeconfigPath}` : ''} label node ${config.nodeName} ${key}-`,
              }),
            ) || []),
            ...(config.annotations?.map<LocalExecProvisioner>(
              ({ key, value, present }) => ({
                type: 'local-exec',
                command: present
                  ? `kubectl ${config.kubeconfigPath ? `--kubeconfig=${config.kubeconfigPath}` : ''} annotate node ${config.nodeName} ${key}="${value}" --overwrite`
                  : `kubectl ${config.kubeconfigPath ? `--kubeconfig=${config.kubeconfigPath}` : ''} annotate node ${config.nodeName} ${key}-`,
              }),
            ) || []),
          ]
        : undefined,
    });
  }
}
