import path from 'path';
import { javascript, typescript } from 'projen';
import { GithubCredentials } from 'projen/lib/github';
import { ArrowParens } from 'projen/lib/javascript';
import {
  DependencyAuxiliary,
  EnvironmentAuxiliary,
  CdktfAuxiliary,
} from './manager/aux';
import { AppConfigSchema } from './src/config/app.config.schema';

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
  const managerDir = 'manager';
  const dirs = {
    dirs: [srcDir],
    devDirs: [managerDir],
    etc: {
      cdktfCodeMarkerDir: path.join(srcDir, 'terraform'),
      envDir: 'env',
      projenAuxDataDir: path.join(managerDir, 'data'),
    },
  };
  const projenCredentials = {
    githubTokenCredential: GithubCredentials.fromPersonalAccessToken({
      secret: 'GITHUB_TOKEN',
    }),
  };
  return { project, author, branches, dirs, projenCredentials };
})();

const project = new typescript.TypeScriptAppProject({
  // TypeScriptProjectOptions
  eslintOptions: {
    tsconfigPath: './tsconfig.dev.json',
    dirs: constants.dirs.dirs,
    devdirs: constants.dirs.devDirs,
    ignorePatterns: [
      '/**/node_modules/*',
      `${constants.dirs.etc.cdktfCodeMarkerDir}/`,
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
        '@cdktf': ['src/cdktf'],
        '@cdktf/*': ['src/cdktf/*'],
        '@common': ['src/common'],
        '@common/*': ['src/common/*'],
        '@config': ['src/config'],
        '@config/*': ['src/config/*'],
        '@terraform': [constants.dirs.etc.cdktfCodeMarkerDir],
        '@terraform/*': [`${constants.dirs.etc.cdktfCodeMarkerDir}/*`],
        // cdktf: ['node_modules/cdktf'],
        // constructs: ['node_modules/constructs'],
      },
    },
  },
  tsconfigDev: {
    include: constants.dirs.devDirs.map(eachDevDir => `${eachDevDir}/**/*.ts`),
    compilerOptions: {},
  },
  // NodeProjectOptions
  defaultReleaseBranch: constants.branches.main,
  release: false,
  depsUpgrade: true,
  depsUpgradeOptions: {
    workflowOptions: {
      schedule: javascript.UpgradeDependenciesSchedule.WEEKLY,
      projenCredentials: constants.projenCredentials.githubTokenCredential,
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
  // GitHubProjectOptions
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
  gitignore: ['.DS_STORE', 'tmp', constants.dirs.etc.envDir],

  // TMP
  deps: ['flat@5.0.2'],
  devDeps: ['flatley', '@types/flat', 'deepmerge', 'husky'],
});

void (async () => {
  project.addScripts({
    postprojen: 'cdktf get',
  });

  // Add abs paths to git ignore
  project.gitignore.addPatterns(
    ...(
      [process.env.devContainerTerraformOutputDirContainerPath].filter(
        eachAbsPath => eachAbsPath != undefined,
      ) as Array<string>
    ).map(eachAbsPath => `/${path.relative(project.outdir, eachAbsPath)}`),
  );

  // Aux
  const depsAux = new DependencyAuxiliary(project, {
    jsonDirPath: path.join(constants.dirs.etc.projenAuxDataDir, 'deps'),
    fileNamePrefix: 'project',
  });
  await depsAux.process();

  const envAux = new EnvironmentAuxiliary<typeof AppConfigSchema>(project, {
    envDirPath: constants.dirs.etc.envDir,
    default: {},
    settings: {
      app: {},
    },
  });
  await envAux.process();

  const cdktfAux = new CdktfAuxiliary(project, {
    cdktfJsonConfig: {
      app: 'yarn nest start',
      language: 'typescript',
      codeMakerOutput: constants.dirs.etc.cdktfCodeMarkerDir,
      projectId: process.env.CDKTF_PROJECT_ID!!,
      terraformProviders: [
        {
          // https://registry.terraform.io/providers/hashicorp/local/latest
          name: 'local',
          source: 'hashicorp/local',
          version: '~> 2.4',
        },
      ],
    },
  });

  await cdktfAux.process();

  project.synth();
})();
