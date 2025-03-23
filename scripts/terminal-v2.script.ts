import { BinaryTerminal } from './terminal/binary.terminal';

import { execSync, spawnSync } from 'child_process';

const binaryTerminal = new BinaryTerminal();
void (async () => {
  const r = await binaryTerminal.execute();
  //   console.log(r);
})();

// // console.log(process.argv);
// // const r = program
// //   .option('-a, --add', 'add a new item')
// //   .argument('<item>', 'the item to add')
// //   .allowUnknownOption()
// //   .allowExcessArguments()
// //   .parse(process.argv);

// // console.log(r.args);

// const r = spawnSync('printenv', ['|', 'grep', 'port']);
// console.log(r.stdout.toString());

// execSync('docker exec -it okeBastionSessionContainer /bin/bash', {
//   stdio: 'inherit',
// });
