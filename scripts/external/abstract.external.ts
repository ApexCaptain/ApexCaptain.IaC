import path from 'path';
import { Command, Option } from 'commander';
import moment from 'moment-timezone';
import fs from 'fs';

export interface ExternalProgramOptions {
  calledFromTerraform: boolean;
}
export interface ExternalProgramOutput {
  [key: string]: string;
}

export abstract class ExternalProgram<
  T_Options = {},
  T_Output extends ExternalProgramOutput = ExternalProgramOutput,
> {
  private static logDirPath = path.join(__dirname, 'logs');
  private logFilePath: string;
  protected command: Command;

  private _option: T_Options & ExternalProgramOptions;
  get option() {
    return this._option;
  }

  constructor(
    private readonly programName: string,
    options: Option[] = [],
  ) {
    this.logFilePath = path.join(
      ExternalProgram.logDirPath,
      `${this.programName}.log`,
    );

    this.command = new Command(this.programName);

    this._option = (() => {
      options.forEach(option => {
        this.command.addOption(option);
      });
      return this.command;
    })()
      .addOption(
        new Option(
          '-f, --called-from-terraform',
          'Whether this program is called from terraform',
        ).default(false),
      )
      .parse(process.argv)
      .opts() as T_Options & ExternalProgramOptions;
  }

  protected abstract execute(): Promise<T_Output>;

  protected log(message: any, level: 'info' | 'error' = 'info') {
    const timestamp = moment()
      .tz('Asia/Shanghai')
      .format('YYYY-MM-DD HH:mm:ss');
    const logMessage = `[ ${level} ][ ${timestamp}] : ${JSON.stringify(message, null, 2)}`;

    if (!this.option.calledFromTerraform) console.log(logMessage);
    if (!fs.existsSync(ExternalProgram.logDirPath)) {
      fs.mkdirSync(ExternalProgram.logDirPath, { recursive: true });
    }
    if (fs.existsSync(this.logFilePath)) {
      fs.appendFileSync(this.logFilePath, `${logMessage}\n`);
    } else {
      fs.writeFileSync(this.logFilePath, `${logMessage}\n`);
    }
  }

  async run() {
    try {
      const output = JSON.stringify(await this.execute(), null, 2);
      if (this.option.calledFromTerraform) console.log(output);
      process.exit(0);
    } catch (error) {
      this.log(error, 'error');
      process.exit(1);
    }
  }
}
