import { AbstractTerminal, Choice } from '.';
import { okeEndpointSource } from '../generated/K8S_Oke_Endpoint_Stack-okeEndpointSource.source';

export type KubectlEndpoint = {
  kubeConfigFilePath: string;
  socks5ProxyUrl?: string;
};
export class KubectlEndpointTerminal extends AbstractTerminal<KubectlEndpoint> {
  protected async generateChoices(): Promise<Choice<KubectlEndpoint>[]> {
    return [
      {
        value: {
          kubeConfigFilePath: okeEndpointSource.kubeConfigFilePath,
          socks5ProxyUrl: okeEndpointSource.proxyUrl.socks5,
        },
        name: 'OKE',
        description: 'Oracle Kubernetes Engine (OKE) Apex Captain',
      },
      {
        value: {
          kubeConfigFilePath:
            process.env.CONTAINER_WORKSTATION_KUBE_CONFIG_FILE_PATH!!,
        },
        name: 'Home',
        description: 'MicroK8s Home',
      },
    ];
  }
  constructor() {
    super({
      name: 'Kubectl Endpoint',
      description: 'Select a kubectl endpoint',
      type: 'argument',
    });
  }
  async execute() {
    return await this.choose();
  }
}
