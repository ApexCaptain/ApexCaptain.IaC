import { execSync } from 'child_process';
import dns from 'dns/promises';
import path from 'path';
import { flatten } from 'flat';
import {
  IniFile,
  javascript,
  JsonFile,
  TaskStep,
  TextFile,
  typescript,
} from 'projen';
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
  const scriptDir = 'scripts';
  const kubeConfigDirPath = '.kube';
  const keysDir = 'keys';
  const libDir = 'lib';
  const envDir = 'env';
  const dynamicEnvironments = {
    k8s: {
      oke: {
        apexCaptain: {
          kubeConfigFilePath:
            'DYNAMIC_ENVIRONMENT_K8S_OKE_APEX_CAPTAIN_KUBE_CONFIG_FILE_PATH',
          socks5ProxyUrl:
            'DYNAMIC_ENVIRONMENT_K8S_OKE_APEX_CAPTAIN_SOCKS5_PROXY_URL',
          simpleProxyUrl:
            'DYNAMIC_ENVIRONMENT_K8S_OKE_APEX_CAPTAIN_SIMPLE_PROXY_URL',
        },
      },
    },
  };

  const cdktfOutDir = 'cdktf.out';

  const cdktfConfigFilePath = 'cdktf.json';
  const cdktfOutFilePath = 'cdktf.out.json';
  const ociCliConfigFilePath = process.env.OCI_CLI_CONFIG_FILE_NAME!!;

  const paths = {
    dirs: {
      srcDir,
      scriptDir,
      kubeConfigDirPath,
      keysDir,
      libDir,
      envDir,
      cdktfOutDir,
    },
    files: {
      cdktfConfigFilePath,
      cdktfOutFilePath,
      ociCliConfigFilePath,
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
    dynamicEnvironments,
    projenCredentials,
  };
})();

const project = new typescript.TypeScriptAppProject({
  // TypeScript Project Options
  eslintOptions: {
    tsconfigPath: './tsconfig.dev.json',
    dirs: [constants.paths.dirs.srcDir],
    devdirs: [constants.paths.dirs.scriptDir],
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
  tsconfigDev: {
    include: [constants.paths.dirs.scriptDir].map(
      eachDevDir => `${eachDevDir}/**/*.ts`,
    ),
  },
  // Node Project Options
  npmignoreEnabled: false,
  buildWorkflow: false,
  jest: false,
  defaultReleaseBranch: constants.branches.main,
  release: false,
  // @ToDo 나중에 재설정
  depsUpgrade: true,
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
    '.secrets',
    `/${constants.paths.dirs.kubeConfigDirPath}`,
    `/${constants.paths.files.cdktfConfigFilePath}`,
    `/${constants.paths.files.cdktfOutFilePath}`,
    `/${constants.paths.files.ociCliConfigFilePath}`,
    `/${constants.paths.dirs.envDir}`,
    `/${constants.paths.dirs.cdktfOutDir}`,
    `/${constants.paths.dirs.keysDir}`,
  ],
  // @ToDo 이 부분 나중에 수정
  deps: [
    'cdktf',
    'cdktf-cli',
    'cdktf-injector',
    'constructs',
    'class-transformer',
    'class-validator',
    'reflect-metadata',
    '@nestjs/common',
    '@nestjs/config',
    '@nestjs/core',
    '@hapi/joi',
    'joi-extract-type',
    'flat@5.0.2',
    'lodash',
    'deepmerge',
    'cron-time-generator',
  ],
  devDeps: [
    '@nestjs/cli',
    '@nestjs/schematics',
    '@nestjs/testing',
    '@types/flat@5.0.2',
    'constructs@^10.4.2',
    '@types/lodash',
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
    'tf@deploy': `cdktf deploy --outputs-file ./${constants.paths.files.cdktfOutFilePath} --outputs-file-include-sensitive-outputs --parallelism 20`,
    'tf@plan': 'cdktf diff',

    'k8s@workstation':
      'kubectl --kubeconfig ${CONTAINER_WORKSTATION_KUBE_CONFIG_FILE_PATH}',
    'k8s@oke': `HTTPS_PROXY=$${constants.dynamicEnvironments.k8s.oke.apexCaptain.socks5ProxyUrl} kubectl --kubeconfig $${constants.dynamicEnvironments.k8s.oke.apexCaptain.kubeConfigFilePath}`,
  });

  const apexCaptainOciPrivateKeyFile = new TextFile(
    project,
    'keys/APEX_CAPTAIN_OCI_PRIVATE_KEY.pem',
    {
      lines: process.env.APEX_CAPTAIN_OCI_PRIVATE_KEY?.split('\\n'),
      editGitignore: false,
    },
  );

  // Generate Oci Cli Config File
  const ociCliConfigFile = new TextFile(
    project,
    constants.paths.files.ociCliConfigFilePath,
    {
      lines: [
        `[DEFAULT]`,
        `user=${process.env.APEX_CAPTAIN_OCI_USER_OCID}`,
        `fingerprint=${process.env.APEX_CAPTAIN_OCI_FINGERPRINT}`,
        `key_file=${apexCaptainOciPrivateKeyFile.absolutePath}`,
        `tenancy=${process.env.APEX_CAPTAIN_OCI_TENANCY_OCID}`,
        `region=${process.env.APEX_CAPTAIN_OCI_REGION}`,
      ],
      editGitignore: false,
    },
  );

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
        // Official
        {
          // https://registry.terraform.io/providers/hashicorp/random/latest
          name: 'random',
          source: 'hashicorp/random',
        },
        {
          // https://registry.terraform.io/providers/hashicorp/tls/latest
          name: 'tls',
          source: 'hashicorp/tls',
        },
        {
          // https://registry.terraform.io/providers/hashicorp/local/latest
          name: 'local',
          source: 'hashicorp/local',
        },
        {
          // https://registry.terraform.io/providers/hashicorp/kubernetes/latest
          name: 'kubernetes',
          source: 'hashicorp/kubernetes',
        },
        {
          // https://registry.terraform.io/providers/hashicorp/helm/latest
          name: 'helm',
          source: 'hashicorp/helm',
        },
        // https://registry.terraform.io/providers/hashicorp/null/latest
        {
          name: 'null',
          source: 'hashicorp/null',
        },
        // Partners
        {
          // https://registry.terraform.io/providers/integrations/github/latest
          name: 'github',
          source: 'integrations/github',
        },
        {
          // https://registry.terraform.io/providers/cloudflare/cloudflare/latest
          name: 'cloudflare',
          source: 'cloudflare/cloudflare',
        },
        {
          // https://registry.terraform.io/providers/oracle/oci/latest
          name: 'oci',
          source: 'oracle/oci',
        },
        // Community
        {
          // https://registry.terraform.io/providers/kreuzwerker/docker/latest
          name: 'docker',
          source: 'kreuzwerker/docker',
        },
      ],
    },
    committed: false,
  });

  // ENV
  const environment: GlobalConfigType = {
    terraform: {
      stacks: {
        common: {
          generatedKeyFilesDirRelativePaths: {
            secrets: './.secrets/keys/generated',
            keys: constants.paths.dirs.keysDir,
          },
          kubeConfigDirRelativePath: constants.paths.dirs.kubeConfigDirPath,
        },
        cloudflare: {
          zone: {
            ayteneve93com: {
              zoneId:
                process.env.APEX_CAPTAIN_CLOUDFLARE_AYTENEVE93_COM_ZONE_ID!!,
            },
          },
        },
        k8s: {
          oke: {
            bastion: {
              clientCidrBlockAllowList: [
                `${(await dns.lookup(process.env.WORKSTATION_COMMON_DOMAIN_IPTIME || '')).address}/32`,
              ],
              dynamicEnvironmentKeys: {
                kubeConfigFilePath:
                  constants.dynamicEnvironments.k8s.oke.apexCaptain
                    .kubeConfigFilePath,
                socks5ProxyUrl:
                  constants.dynamicEnvironments.k8s.oke.apexCaptain
                    .socks5ProxyUrl,
                simpleProxyUrl:
                  constants.dynamicEnvironments.k8s.oke.apexCaptain
                    .simpleProxyUrl,
              },
            },
          },
          workstation: {
            common: {
              domain: {
                iptime: process.env.WORKSTATION_COMMON_DOMAIN_IPTIME!!,
              },
              volumeDirPath: {
                ssdVolume:
                  process.env.WORKSTATION_COMMON_VOLUME_DIR_PATH_SDD_VOLUME!!,
                hddVolume:
                  process.env.WORKSTATION_COMMON_VOLUME_DIR_PATH_HDD_VOLUME!!,
              },
            },
            sftp: {
              userName: process.env.WORKSTATION_SFTP_USER_NAME!!,
            },
            palworld: {
              adminPassword: process.env.WORKSTATION_PALWORLD_ADMIN_PASSWORD!!,
              serverPassword:
                process.env.WORKSTATION_PALWORLD_SERVER_PASSWORD!!,
            },
          },
        },
      },
      config: {
        backends: {
          localBackend: {
            secrets: {
              dirPath: path.join(
                process.env.CONTAINER_SECRETS_DIR_PATH ??
                  path.join(project.outdir, '.secrets'),
                'terraform',
              ),
            },
          },
        },
        providers: {
          cloudflare: {
            ApexCaptain: {
              apiToken: process.env.APEX_CAPTAIN_CLOUDFLARE_API_TOKEN!!,
            },
          },

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
                  process.env.CONTAINER_WORKSTATION_KUBE_CONFIG_FILE_PATH!!,
              },
            },
          },

          oci: {
            ApexCaptain: {
              userOcid: process.env.APEX_CAPTAIN_OCI_USER_OCID!!,
              fingerprint: process.env.APEX_CAPTAIN_OCI_FINGERPRINT!!,
              tenancyOcid: process.env.APEX_CAPTAIN_OCI_TENANCY_OCID!!,
              region: process.env.APEX_CAPTAIN_OCI_REGION!!,
              privateKey: process.env.APEX_CAPTAIN_OCI_PRIVATE_KEY!!,
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

  project.postSynthesize = () => {
    execSync(`chmod 400 ${apexCaptainOciPrivateKeyFile.absolutePath}`);
    execSync(`chmod 600 ${ociCliConfigFile.absolutePath}`);
  };

  project.synth();
})();
