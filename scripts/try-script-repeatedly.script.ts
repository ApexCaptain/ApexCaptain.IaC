import { execSync } from 'child_process';
import chalk from 'chalk';
import { Command, Argument, Option } from 'commander';
import wait from 'wait';

// yarn ts-node ./scripts/try-script-repeatedly.script.ts "yarn tf@deploy:single K8S_Oke_Cluster_Stack --auto-approve" -d 60000
const params = new Command('try-script-repeatedly')
  .addArgument(new Argument('[Script]', 'The script to run'))
  .addOption(
    new Option(
      '-n, --count <number>',
      'The number of times to run the script, default is -1 (infinite)',
    ).default(-1),
  )
  .addOption(
    new Option(
      '-d, --delay <number>',
      'The delay between runs in milliseconds, default is 10,000 (10 seconds)',
    ).default(10000),
  )
  .parse(process.argv);

const options = params.opts<{
  count: number;
  delay: number;
}>();
const script = params.args[0];

void (async () => {
  let currentCount = 0;

  if (options.count == 0) {
    throw new Error('Count cannot be 0');
  }

  while (true) {
    currentCount++;
    console.info(
      chalk.green(
        `Running script #${currentCount}, ${options.count < 0 ? 'no limit.' : `limit is ${options.count}.`}`,
      ),
    );
    try {
      execSync(script, { stdio: 'inherit' });
      console.info(chalk.green('Script executed successfully.'));
      break;
    } catch (error) {
      console.error(
        chalk.red(
          `Script executed failed. Retrying after ${options.delay}ms...`,
        ),
      );
      await wait(options.delay);
    }
    if (options.count > 0 && currentCount >= options.count) {
      console.error(chalk.red('Script executed failed. Limit reached.'));
      break;
    }
  }
})();
