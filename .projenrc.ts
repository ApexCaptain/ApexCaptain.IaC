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
import { VsCode } from 'projen/lib/vscode';

const flatley = <TargetType, ResultType>(
  target: TargetType,
  opts?: {
    coercion?: {
      test: (key: string, value: any) => boolean;
      transform: (value: any) => any;
    }[];
    filters?: {
      test: (key: string, value: any) => boolean;
    }[];
  } & Parameters<typeof flatten>[1],
): ResultType => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('flatley')(target, opts);
};

class VsCodeObject<ObjectType extends Object> {
  static isVscodeObject(target: any): target is VsCodeObject<any> {
    return (
      typeof target == 'object' &&
      '__projen_aux_object_key' in target &&
      (target as VsCodeObject<any>).__projen_aux_object_key ==
        VsCodeObject.__projen_aux_object_key
    );
  }
  private static __projen_aux_object_key = '__PROJEN_AUX_OBJECT_KEY' as const;
  private __projen_aux_object_key = VsCodeObject.__projen_aux_object_key;
  constructor(readonly object: ObjectType) {}
}

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
  const libDir = 'lib';
  const generatedScriptLibDir = path.join(scriptDir, 'generated');
  const envDir = 'env';
  const keysDir = 'keys';
  const secretsDir = '.secrets';
  const tmpDir = 'tmp';

  const cdktfOutDir = 'cdktf.out';

  const cdktfConfigFilePath = 'cdktf.json';
  const cdktfOutFilePath = 'cdktf.out.json';
  const ociCliConfigFilePath = path.relative(
    process.cwd(),
    process.env.OCI_CLI_CONFIG_FILE ?? 'keys/oci.config',
  );

  const paths = {
    dirs: {
      srcDir,
      scriptDir,
      kubeConfigDirPath,
      libDir,
      generatedScriptLibDir,
      envDir,
      cdktfOutDir,
      keysDir,
      secretsDir,
      tmpDir,
    },
    files: {
      cdktfConfigFilePath,
      cdktfOutFilePath,
      ociCliConfigFilePath,
    },
  };

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
    devdirs: [constants.paths.dirs.scriptDir],
    ignorePatterns: [
      '/**/node_modules/*',
      `${constants.paths.dirs.libDir}/`,
      `${constants.paths.dirs.generatedScriptLibDir}/`,
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

  // Node Package Options
  license: 'MIT',
  licensed: true,
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
    `/${constants.paths.dirs.secretsDir}`,
    `/${constants.paths.dirs.kubeConfigDirPath}`,
    `/${constants.paths.files.cdktfConfigFilePath}`,
    `/${constants.paths.files.cdktfOutFilePath}`,
    `/${constants.paths.dirs.envDir}`,
    `/${constants.paths.dirs.keysDir}`,
    `/${constants.paths.dirs.cdktfOutDir}`,
    `/${constants.paths.dirs.generatedScriptLibDir}`,
    `/${constants.paths.dirs.tmpDir}`,
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
    'yaml',
  ],
  devDeps: [
    '@nestjs/cli',
    '@nestjs/schematics',
    '@nestjs/testing',
    '@types/flat@5.0.2',
    'constructs@^10.4.2',
    '@types/lodash',
    'commander',
    'flatley',
    'fuzzy',
    '@inquirer/prompts',
    'inquirer-autocomplete-standalone',
  ],
});

void (async () => {
  // Tasks
  (project.compileTask as any)._steps = new Array<TaskStep>({
    exec: 'nest build',
  });

  // Set Package Scripts
  project.addScripts({
    // Projen
    postprojen: 'cdktf get',

    // Terraform
    'tf@build': 'cdktf synth',
    'tf@deploy': `cdktf deploy --outputs-file ./${constants.paths.files.cdktfOutFilePath} --outputs-file-include-sensitive-outputs --parallelism 20`,
    'tf@plan': 'cdktf diff',

    // Terminal
    terminal: 'ts-node ./scripts/terminal-v2.script.ts',
  });

  const apexCaptainOciPrivateKeyFile = new TextFile(
    project,
    path.join(constants.paths.dirs.keysDir, 'APEX_CAPTAIN_OCI_PRIVATE_KEY.pem'),
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
          // https://registry.terraform.io/providers/hashicorp/consul/latest
          name: 'consul',
          source: 'hashicorp/consul',
        },
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
        {
          // https://registry.terraform.io/providers/hashicorp/time/latest
          name: 'time',
          source: 'hashicorp/time',
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
  const workstationIpAddress = (
    await dns.lookup(process.env.WORKSTATION_COMMON_DOMAIN_IPTIME || '')
  ).address;
  const environment: GlobalConfigType = {
    terraform: {
      stacks: {
        common: {
          generatedKeyFilesDirPaths: {
            relativeSecretsDirPath: path.join(
              constants.paths.dirs.secretsDir,
              'keys',
              'generated',
            ),
            relativeKeysDirPath: constants.paths.dirs.keysDir,
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
            apps: {
              oauth2Proxy: {
                clientId:
                  process.env.APEX_CAPTAIN_GITHUB_ADMIN_OAUTH_APP_CLIENT_ID!!,
                clientSecret:
                  process.env
                    .APEX_CAPTAIN_GITHUB_ADMIN_OAUTH_APP_CLIENT_SECRET!!,
                allowedGithubUsers: ['ApexCaptain'],
              },
              homeL2tpVpnProxy: {
                vpnServerAddr: workstationIpAddress,
                vpnUsername:
                  process.env
                    .WORKSTATION_VPN_L2TP_OKE_PORXY_SERVICE_USER_ACCOUNT!!,
                vpnPassword:
                  process.env
                    .WORKSTATION_VPN_L2TP_OKE_PORXY_SERVICE_USER_PASSWORD!!,
                vpnIpsToRoute:
                  process.env.WORKSTATION_VPN_L2TP_IPS_TO_ROUTE_CSV!!,
                vpnGatewayIp: process.env.WORKSTATION_VPN_L2TP_GATEWAY_IP!!,
              },
            },
            bastion: {
              clientCidrBlockAllowList: [`${workstationIpAddress}/32`],
            },
            network: {
              l2tpServerCidrBlocks: [`${workstationIpAddress}/32`],
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
        generatedScriptLibDirRelativePath:
          constants.paths.dirs.generatedScriptLibDir,
      },
    },
  };

  new IniFile(project, 'env/prod.env', {
    obj: flatten(environment, {
      delimiter: '_',
    }),
    committed: false,
  });

  // Vscode Settings
  const vscodeSettings = {
    todohighlight: {
      toggleURI: true,
      isCaseSensitive: false,
      keywords: new VsCodeObject([
        { text: '@' + 'ToDo', color: 'red', backgroundColor: 'pink' },
      ]),
      exclude: ['**/node_modules/**', '.vscode'],
    },
    workbench: {
      colorTheme: 'Tomorrow Night Blue',
      editorAssociations: new VsCodeObject({
        '*.md': 'vscode.markdown.preview.editor',
      }),
    },
    'material-icon-theme': {
      files: {
        associations: new VsCodeObject({
          '.projenrc.ts': 'cabal',
          '*.schema.ts': 'scheme',
          '*.stack.ts': 'terraform',
          'cdktf.json': 'terraform',
          'cdktf.out.json': 'terraform',
          'index.ts': 'contributing',
          '*.template.ts': 'templ',
          '*.enum.ts': 'scheme',
          '*.function.ts': 'fortran',
          '*.type.ts': 'toml',
          '*.script.ts': 'coffee',
          '*.source.ts': 'cake',
          '*.terminal.ts': 'console',
        }),
      },
      folders: {
        associations: new VsCodeObject({
          abstract: 'class',
          '.kube': 'kubernetes',
          kubectl: 'kubernetes',
          oke: 'kubernetes',
          workstation: 'home',
          '.projen': 'project',
          'cdktf.out': 'terraform',
          terminal: 'command',
          ssh: 'command',
        }),
      },
    },
  };
  new VsCode(project).settings.addSettings(
    flatley(vscodeSettings, {
      safe: true,
      coercion: [
        {
          test: (_, value) => {
            return VsCodeObject.isVscodeObject(value);
          },
          transform: (value: VsCodeObject<any>) => value.object,
        },
      ],
    }),
  );

  project.postSynthesize = () => {
    execSync(`chmod 400 ${apexCaptainOciPrivateKeyFile.absolutePath}`);
    execSync(`chmod 600 ${ociCliConfigFile.absolutePath}`);
  };

  project.synth();
})();
