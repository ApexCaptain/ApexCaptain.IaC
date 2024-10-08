import crypto from 'crypto';
import path from 'path';
import { javascript, JsonFile, TaskStep, typescript } from 'projen';
import { GithubCredentials } from 'projen/lib/github';
import { ArrowParens } from 'projen/lib/javascript';

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
  const cdktfOutFilePath = 'cdktf.out.json';

  const paths = {
    dirs: [srcDir],
    etc: {
      cdktfOutFilePath,
      generatedSrcDir: path.join(srcDir, 'generated'),
      envDir: 'env',
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
    dirs: constants.paths.dirs,
    ignorePatterns: [
      '/**/node_modules/*',
      `${constants.paths.etc.generatedSrcDir}/`,
    ],
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
    `/${constants.paths.etc.cdktfOutFilePath}`,
    constants.paths.etc.generatedSrcDir,
    `/${constants.paths.etc.envDir}`,
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
  ],
  devDeps: ['@nestjs/cli', '@nestjs/schematics', '@nestjs/testing'],
});

void (async () => {
  // Tasks
  (project.compileTask as any)._steps = new Array<TaskStep>({
    exec: 'nest build',
  });

  // Set Package Scripts
  project.addScripts({
    postprojen: 'cdktf get',
  });

  // TMP
  new JsonFile(project, 'cdktf.json', {
    obj: {
      output: constants.paths.etc.cdktfOutFilePath,
      codeMakerOutput: path.join(
        constants.paths.etc.generatedSrcDir,
        'terraform',
      ),
      sendCrashReports: false,
      app: 'yarn nest start',
      language: 'typescript',
      projectId: '90c97a39-d903-4bee-8832-b9f851b70889',
      terraformProviders: [
        {
          name: 'local',
          source: 'hashicorp/local',
        },
        {
          name: 'github',
          source: 'integrations/github',
        },
      ],
    },
  });

  project.synth();
})();
