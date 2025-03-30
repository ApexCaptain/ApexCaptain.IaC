import { AbstractTerminal, ConsulEndpoint } from '.';

enum ConsulCommand {
  CATALOG = 'catalog',
}

export class ConsulCommandTerminal extends AbstractTerminal<ConsulCommand> {
  constructor(
    private readonly option: {
      endpoint: ConsulEndpoint;
    },
  ) {
    super({
      name: 'Consul Command',
      description: 'Select a Consul command',
      type: 'argument',
    });
  }
  protected async generateChoices() {
    return [
      {
        value: ConsulCommand.CATALOG,
        name: 'catalog',
        description: 'Catalog',
      },
    ];
  }
  async execute() {
    const command = await this.choose();
    switch (command) {
      case ConsulCommand.CATALOG:
        await this.runTerminal(['consul', 'catalog'], {
          ...process.env,
          CONSUL_HTTP_ADDR: this.option.endpoint.address,
          CONSUL_HTTP_TOKEN: this.option.endpoint.token,
        });
        break;
    }
    return command;
  }
}
