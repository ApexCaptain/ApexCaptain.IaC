import { exec, ExecOptions, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { Argument, Command, Option } from 'commander';
import * as rxjs from 'rxjs';
import wait from 'wait';

const execPromise = (command: string, execOptions?: ExecOptions) =>
  new Promise((resolve, reject) => {
    exec(command, execOptions, (error, stdout, stderr) => {
      if (stderr) {
        return reject(new Error(stderr.toString()));
      }
      if (error) {
        return reject(error);
      }
      resolve(stdout);
    });
  });
const command = new Command('install-tf-providers')
  .addArgument(
    new Argument('[cdktf-out-dir]', 'The path to the cdktf out directory'),
  )
  .addOption(
    new Option(
      '-p, --parallelism <number>',
      'The parallelism of the terraform providers installation',
    )
      .argParser(value => parseInt(value))
      .default(-1),
  )
  .parse(process.argv);

const targetDir = command.args[0];
const options = command.opts() as {
  parallelism: number;
};

void (async () => {
  await rxjs.lastValueFrom(
    rxjs
      .from(
        fs
          .readdirSync(path.join(process.cwd(), targetDir, 'stacks'))
          .map(eachDir =>
            rxjs.defer(async () => {
              console.log(
                chalk.green(`Installing providers for "${eachDir}"...`),
              );
              while (true) {
                try {
                  await execPromise(`terraform init`, {
                    cwd: path.join(process.cwd(), targetDir, 'stacks', eachDir),
                  });
                  console.info(
                    chalk.blue(`Installed providers for "${eachDir}"`),
                  );
                  break;
                } catch (error) {
                  const errorMessage = (error as Error).toString();
                  switch (true) {
                    case errorMessage.includes('text file busy'):
                      break;
                    case errorMessage.includes('TLS handshake timeout'):
                      break;
                    default:
                      console.error(
                        chalk.red(
                          `Failed to install providers for "${eachDir}": ${errorMessage}`,
                        ),
                      );
                      throw error;
                  }
                  console.warn(
                    chalk.yellow(
                      `Failed to install providers for "${eachDir}". Retrying after 5 second...`,
                    ),
                  );
                  await wait(5000);
                }
              }
            }),
          ),
      )
      .pipe(
        rxjs.mergeAll(
          options.parallelism > 0 ? options.parallelism : undefined,
        ),
      ),
  );
})();
