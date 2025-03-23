import { AbstractTerminal, Choice } from './';

export enum KubectlResource {
  POD = 'pod',
  SERVICE = 'service',
  DEPLOYMENT = 'deployment',
  INGRESS = 'ingress',
}

export class KubectlResourceTerminal extends AbstractTerminal<KubectlResource> {
  protected generateChoices(): Promise<Choice<KubectlResource>[]> {
    return Promise.resolve(
      [
        {
          value: KubectlResource.POD,
          name: 'pod',
          description: 'Pod is a single instance of an application.',
        },
        {
          value: KubectlResource.SERVICE,
          name: 'service',
          description: 'Service is a service that exposes a pod.',
        },
        {
          value: KubectlResource.DEPLOYMENT,
          name: 'deployment',
          description: 'Deployment is a deployment that exposes a pod.',
        },
        {
          value: KubectlResource.INGRESS,
          name: 'ingress',
          description: 'Ingress is a ingress that exposes a pod.',
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
