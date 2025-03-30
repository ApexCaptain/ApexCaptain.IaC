import { AbstractTerminal, Choice } from './';

export enum KubectlResource {
  PODS = 'pods',
  SERVICES = 'services',
  DEPLOYMENTS = 'deployments',
  INGRESS = 'ingress',
  NODES = 'nodes',
  CONFIGMAPS = 'configmaps',
}

export class KubectlResourceTerminal extends AbstractTerminal<KubectlResource> {
  protected generateChoices(): Promise<Choice<KubectlResource>[]> {
    return Promise.resolve(
      [
        {
          value: KubectlResource.PODS,
          name: 'pods',
          description: 'Pod is a single instance of an application.',
        },
        {
          value: KubectlResource.SERVICES,
          name: 'services',
          description: 'Service is a service that exposes a pod.',
        },
        {
          value: KubectlResource.DEPLOYMENTS,
          name: 'deployments',
          description: 'Deployment is a deployment that exposes a pod.',
        },
        {
          value: KubectlResource.INGRESS,
          name: 'ingress',
          description: 'Ingress is a ingress that exposes a pod.',
        },
        {
          value: KubectlResource.NODES,
          name: 'nodes',
          description: 'Node is a node that exposes a pod.',
        },
        {
          value: KubectlResource.CONFIGMAPS,
          name: 'configmaps',
          description: 'Configmap is a configmap that exposes a pod.',
        },
      ].filter(each => !this.option.disabled.includes(each.value)),
    );
  }
  async execute() {
    const resource = await this.choose();
    return resource;
  }
  constructor(private readonly option: { disabled: KubectlResource[] }) {
    super({
      name: 'Kubectl Resource',
      description: 'Select a kubectl resource',
      type: 'argument',
    });
  }
}
