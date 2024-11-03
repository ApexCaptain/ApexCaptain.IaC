import path from 'path';
import { flatten } from 'flat';
import { IniFile, javascript, JsonFile, TaskStep, typescript } from 'projen';
import { GithubCredentials } from 'projen/lib/github';
import { ArrowParens } from 'projen/lib/javascript';
import { GlobalConfigType } from './src/global/config/global.config.schema';

const constants = (() => {
  const project = {
    name: 'apex-captain.iac',
  };

  const author = {
    name: 'ApexCaptain',
    email: 'ayteneve93@gmail.com',
  };

  const branches = {
    main: 'main',
    develop: 'develop',
  };

  const srcDir = 'src';
  const libDir = 'lib';
  const envDir = 'env';
  const cdktfOutDir = 'cdktf.out';

  const cdktfConfigFilePath = 'cdktf.json';
  const cdktfOutFilePath = 'cdktf.out.json';

  const paths = {
    dirs: {
      srcDir,
      libDir,
      envDir,
      cdktfOutDir,
    },
    files: {
      cdktfConfigFilePath,
      cdktfOutFilePath,
    },
  };

  // @ToDo 추후 재설정
  const projenCredentials = {
    githubTokenCredential: GithubCredentials.fromPersonalAccessToken({
      secret: 'WORKFLOW_TOKEN',
    }),
  };

  return {
    project,
    author,
    branches,
    paths,
    projenCredentials,
  };
})();

const project = new typescript.TypeScriptAppProject({
  // TypeScript Project Options
  eslintOptions: {
    tsconfigPath: './tsconfig.dev.json',
    dirs: [constants.paths.dirs.srcDir],
    ignorePatterns: ['/**/node_modules/*', `${constants.paths.dirs.libDir}/`],
    prettier: true,
  },
  projenrcTs: true,
  tsconfig: {
    compilerOptions: {
      declaration: false,
      module: 'CommonJS',
      emitDecoratorMetadata: true,
      experimentalDecorators: true,
      allowSyntheticDefaultImports: true,
      target: 'es2017',
      outDir: './dist',
      rootDir: './',
      baseUrl: './',
      skipLibCheck: true,
      strictNullChecks: true,
      noImplicitAny: false,
      forceConsistentCasingInFileNames: false,
      noFallthroughCasesInSwitch: false,
      noUnusedLocals: false,
      noUnusedParameters: false,
      paths: {
        '@/*': ['src/*'],
        '@lib/*': ['lib/*'],
      },
    },
    exclude: ['node_modules'],
  },
  // Node Project Options
  npmignoreEnabled: false,
  buildWorkflow: false,
  jest: false,
  defaultReleaseBranch: constants.branches.main,
  release: false,
  // @ToDo 나중에 재설정
  depsUpgrade: false,
  depsUpgradeOptions: {
    workflowOptions: {
      schedule: javascript.UpgradeDependenciesSchedule.WEEKLY,
      projenCredentials: constants.projenCredentials.githubTokenCredential,
      assignees: [constants.author.name],
      branches: [constants.branches.develop],
    },
    pullRequestTitle: 'Upgrade Node Deps',
  },
  prettier: true,
  prettierOptions: {
    settings: {
      semi: true,
      arrowParens: ArrowParens.AVOID,
      endOfLine: javascript.EndOfLine.AUTO,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: javascript.TrailingComma.ALL,
    },
  },
  // GitHub Project Options
  githubOptions: {
    pullRequestLintOptions: {
      semanticTitleOptions: {
        types: ['test', 'feat', 'fix', 'chore', 'dev'],
      },
    },
  },

  projenCredentials: constants.projenCredentials.githubTokenCredential,
  authorName: constants.author.name,
  authorEmail: constants.author.email,
  name: constants.project.name,
  gitignore: [
    '.DS_STORE',
    '.kube',
    `/${constants.paths.files.cdktfConfigFilePath}`,
    `/${constants.paths.files.cdktfOutFilePath}`,
    `/${constants.paths.dirs.envDir}`,
    `/${constants.paths.dirs.cdktfOutDir}`,
  ],
  // @ToDo 이 부분 나중에 수정
  deps: [
    'cdktf',
    'cdktf-cli',
    'cdktf-injector',
    'constructs',
    'reflect-metadata',
    '@nestjs/common',
    '@nestjs/config',
    '@nestjs/core',
    '@hapi/joi',
    'joi-extract-type',
    'flat@5.0.2',
  ],
  devDeps: [
    '@nestjs/cli',
    '@nestjs/schematics',
    '@nestjs/testing',
    '@types/flat@5.0.2',
    'constructs@^10.3.0',
  ],
});

void (async () => {
  // Tasks
  (project.compileTask as any)._steps = new Array<TaskStep>({
    exec: 'nest build',
  });

  // Set Package Scripts
  project.addScripts({
    postprojen: 'cdktf get',
    'tf@build': 'cdktf synth',
    'tf@deploy': `cdktf deploy --outputs-file ./${constants.paths.files.cdktfOutFilePath} --outputs-file-include-sensitive-outputs --parallelism 4`,
    'tf@plan': 'cdktf diff',
  });

  // TMP
  // CDKTF
  new JsonFile(project, constants.paths.files.cdktfConfigFilePath, {
    obj: {
      output: constants.paths.dirs.cdktfOutDir,
      codeMakerOutput: path.join(constants.paths.dirs.libDir, 'terraform'),
      sendCrashReports: false,
      app: 'yarn nest start',
      language: 'typescript',
      projectId: process.env.CDKTF_PROJECT_ID,
      terraformProviders: [
        {
          name: 'local',
          source: 'hashicorp/local',
        },
        {
          name: 'github',
          source: 'integrations/github',
        },
        {
          name: 'kubernetes',
          source: 'hashicorp/kubernetes',
        },
      ],
    },
    committed: false,
  });

  // ENV
  const environment: GlobalConfigType = {
    terraform: {
      config: {
        backends: {
          cloudBackend: {
            ApexCaptain: {
              organization:
                process.env.APEX_CAPTAIN_TERRAFORM_CLOUD_ORGANIZATION!!,
              token: process.env.APEX_CAPTAIN_TERRAFORM_CLOUD_API_TOKEN!!,
              projects: {
                iacProject:
                  process.env.APEX_CAPTAIN_TERRAFORM_CLOUD_IAC_PROJECT!!,
              },
            },
          },
        },
        providers: {
          github: {
            ApexCaptain: {
              owner: process.env.APEX_CAPTAIN_GITHUB_OWNER!!,
              token: process.env.APEX_CAPTAIN_GITHUB_PAT!!,
            },
          },
          kubernetes: {
            ApexCaptain: {
              workstation: {
                configPath:
                  process.env.containerWorkstationKubeconfigFilePath!!,
              },
            },
          },
        },
      },
    },
  };
  new IniFile(project, 'env/prod.env', {
    obj: flatten(environment, {
      delimiter: '_',
    }),
    committed: false,
  });

  project.synth();
})();
