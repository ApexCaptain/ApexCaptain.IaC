import { AbstractTerminal, Choice } from '.';
import { consulApiEndpointSource } from '../generated/K8S_Oke_Apps_Consul_Stack-consulApiEndpointSource.source';

export type ConsulEndpoint = {
  address: string;
  token: string;
};
export class ConsulEndpointTerminal extends AbstractTerminal<ConsulEndpoint> {
  protected async generateChoices(): Promise<Choice<ConsulEndpoint>[]> {
    return [
      {
        value: consulApiEndpointSource,
        name: 'OKE',
        description:
          'Consul cluster on Oracle Kubernetes Engine (OKE) Apex Captain',
      },
    ];
  }
  constructor() {
    super({
      name: 'Consul Endpoint',
      description: 'Select a Consul endpoint',
      type: 'argument',
    });
  }
  async execute() {
    return await this.choose();
  }
}
