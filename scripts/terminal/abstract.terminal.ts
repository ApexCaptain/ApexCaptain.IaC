import { execSync } from 'child_process';
import { input } from '@inquirer/prompts';
import { Option, Command, Argument } from 'commander';
import fuzzy from 'fuzzy';
import autoComplete from 'inquirer-autocomplete-standalone';
import _ from 'lodash';
export type Choice<T_Choice> = {
  value: T_Choice;
  name: string;
  description: string;
  disabled?: boolean;
};

export abstract class AbstractTerminal<T_Choice> {
  private _choices!: Choice<T_Choice>[];
  private parentTerminal?: AbstractTerminal<any>;
  private program: Command;

  constructor(
    private readonly abstractTerminalOption: {
      name: string;
      description: string;
    } & (
      | {
          type: 'none';
        }
      | {
          type: 'argument';
        }
      | {
          type: 'option';
          flag: string;
          useShortFlag: boolean;
        }
    ),
  ) {
    this.program = new Command(this.abstractTerminalOption.name)
      .allowExcessArguments()
      .allowUnknownOption();
  }

  private get choices() {
    return new Promise<Choice<T_Choice>[]>(async resolve => {
      if (!this._choices) this._choices = await this.generateChoices();
      if (this._choices.length == 0) {
        throw new Error(
          `No choices found for ${this.abstractTerminalOption.name}`,
        );
      }
      resolve(this._choices);
    });
  }
  private async getFilteredChoices(searchInput?: string) {
    return fuzzy
      .filter(searchInput ?? '', await this.choices, {
        extract: choice => choice.name,
      })
      .map(choice => choice.original);
  }

  protected async runTerminal(commands: string[], env: NodeJS.ProcessEnv) {
    commands = commands
      .map(each => each.trim())
      .filter(each => !_.isEmpty(each));
    console.log(`\nCurrent command is... \n\n${commands.join(' \\\n\t')}\n\n`);
    commands.push(
      await input({
        message:
          'Enter additional commands or press enter to skip and execute the current command : ',
      }),
    );
    commands = commands
      .map(each => each.trim())
      .filter(each => !_.isEmpty(each));
    console.log(`Running command... \n${commands.join(' \\\n\t')}\n\n`);

    execSync(commands.join(' '), {
      stdio: 'inherit',
      env,
    });
    process.exit(0);
  }
  protected async choose() {
    const { name, description, type } = this.abstractTerminalOption;
    if (type != 'none') {
      switch (type) {
        case 'argument':
          this.program.addArgument(new Argument(`[${name}]`, description));
          break;
        case 'option':
          const { flag, useShortFlag } = this.abstractTerminalOption;
          const trimmedFlag = flag.trim().replace(/^-+/, '');
          this.program.addOption(
            new Option(
              `${[
                useShortFlag ? `-${trimmedFlag[0]}` : undefined,
                `--${trimmedFlag}`,
              ]
                .filter(each => !_.isEmpty(each))
                .join(' ')} <${name}>`,
              description,
            ),
          );
          break;
      }

      this.parentTerminal
        ? this.program.parse(this.parentTerminal.program.args, {
            from: 'user',
          })
        : this.program.parse(process.argv);

      const passedValue =
        this.abstractTerminalOption.type == 'option'
          ? Object.values(this.program.opts())[0]
          : this.program.args[0];

      if (passedValue) {
        if (type == 'argument') {
          this.parentTerminal?.program.args.shift();
          this.program.args.shift();
        }
        const results = await this.getFilteredChoices(passedValue);
        const hitsLength = results.length;
        if (hitsLength == 0) {
          console.warn(`Could not found ${name} like "${passedValue}"`);
        } else if (hitsLength == 1) {
          return results[0].value;
        } else {
          console.warn(
            `Found ${hitsLength} ${name} like "${passedValue}", please refine your keyword next time`,
          );
        }
      }
    }
    return autoComplete({
      message: `Choose available ${name}`,
      searchText: `Searching ${name}...`,
      source: async searchInput => {
        return this.getFilteredChoices(searchInput);
      },
      pageSize: 30,
    });
  }
  protected async next<T_Next_Choice>(
    nextTerminal: AbstractTerminal<T_Next_Choice>,
  ) {
    nextTerminal.parentTerminal = this;
    return nextTerminal.execute();
  }

  protected abstract generateChoices(): Promise<Choice<T_Choice>[]>;
  abstract execute(): Promise<T_Choice>;
}
