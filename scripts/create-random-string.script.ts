import crypto from 'crypto';
import { Option, program } from 'commander';

const command = program
  .addOption(
    new Option('-l, --length <number>')
      .argParser(value => parseInt(value))
      .default(10),
  )
  .parse(process.argv);

const options = command.opts<{ length: number }>();

const createRandomString = () => {
  console.log(
    crypto
      .randomBytes(options.length)
      .toString('base64')
      .slice(0, options.length),
  );
};

void createRandomString();
