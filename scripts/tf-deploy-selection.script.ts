import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { checkbox, confirm } from '@inquirer/prompts';
import { Command, Argument, Option } from 'commander';
import dedent from 'dedent';
import fuzzy from 'fuzzy';

const params = new Command('tf-deploy-selection')
  .addArgument(new Argument('[Stack]', 'The name of the stack to deploy'))
  .addOption(
    new Option('-c, --cdktf-out <path>', 'The path to the cdktf out directory'),
  )
  .parse();

const option = params.opts<{ cdktfOut: string }>();
const targetStack: string | undefined = params.args[0];
const manifestFilePath = path.join(option.cdktfOut, 'manifest.json');

const manifest: {
  stacks: {
    [stackName: string]: {
      annotations: any[];
      constructPath: string;
      dependencies: string[];
      name: string;
      stackMetadataPath: string;
      synthesizedStackPath: string;
      workingDirectory: string;
    };
  };
  version: string;
} = JSON.parse(fs.readFileSync(manifestFilePath, 'utf8'));
const stackCandidates = Object.keys(manifest.stacks).sort((front, rear) =>
  front.localeCompare(rear),
);

const selectTargetStacks = async (
  selectedTargetStack: string | undefined,
): Promise<string[]> => {
  const filteredCandidates = selectedTargetStack
    ? fuzzy
        .filter(selectedTargetStack, stackCandidates)
        .map(each => each.original)
    : stackCandidates;
  switch (filteredCandidates.length) {
    case 0:
      console.warn(
        `No stack candidates found for ${selectedTargetStack}, please select from the following stacks`,
      );
      return checkbox<string>({
        message: 'Select stacks to deploy',
        choices: stackCandidates,
        pageSize: 10,
      });
    case 1:
      return [filteredCandidates[0]];
    default:
      return checkbox<string>({
        message: 'Select stacks to deploy',
        choices: filteredCandidates,
        pageSize: 10,
      });
  }
};
const getStackDependencies = (targetStacks: string[]) => {
  const dependencyStacks = new Set();
  const visitedStacks = new Set();

  const visitStack = (stackName: string) => {
    if (visitedStacks.has(stackName)) {
      return;
    }
    const stackInfo = manifest.stacks[stackName];
    if (!stackInfo) return;
    stackInfo.dependencies.forEach(eachDependency => {
      dependencyStacks.add(eachDependency);
      visitStack(eachDependency);
    });
  };

  targetStacks.forEach(eachStack => {
    visitStack(eachStack);
  });
  targetStacks.forEach(eachStack => {
    dependencyStacks.delete(eachStack);
  });
  return Array.from(dependencyStacks);
};
const deployTargetStacks = async (targetStacks: string[]) => {
  const dependencies = getStackDependencies(targetStacks);
  const includeDependencies =
    dependencies.length > 0
      ? await confirm({
          message: dedent`
      The following stacks are dependencies of the selected stacks:


      ${dependencies.join('\n')}

      
      Do you want to include them in the deployment?
    `,
          default: true,
        })
      : true;
  const finalStacks = includeDependencies
    ? [...targetStacks, ...dependencies]
    : targetStacks;
  try {
    execSync(
      `yarn tf@deploy ${finalStacks.join(' ')} ${
        includeDependencies ? '' : '--ignore-missing-stack-dependencies'
      }`,
      {
        stdio: 'inherit',
      },
    );
  } catch (error) {
    // 별도 에러 처리 하지 않음
  }
};

void (async () => {
  const selectedStacks = await selectTargetStacks(targetStack);
  await deployTargetStacks(selectedStacks);
})();
