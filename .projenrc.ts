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
  const cursorDir = '.cursor';

  const cdktfOutDir = 'cdktf.out';

  const cdktfConfigFilePath = 'cdktf.json';
  const cdktfOutFilePath = 'cdktf.out.json';
  const ociCliConfigFilePath = path.relative(
    process.cwd(),
    process.env.OCI_CLI_CONFIG_FILE ?? 'keys/oci.config',
  );
  const mcpJsonFilePath = path.join(cursorDir, 'mcp.json');

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
      cursorDir,
    },
    files: {
      cdktfConfigFilePath,
      cdktfOutFilePath,
      ociCliConfigFilePath,
      mcpJsonFilePath,
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
    'dedent',
    'moment',
    'moment-timezone',
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
    'tf@deploy:single': `cdktf deploy --outputs-file ./${constants.paths.files.cdktfOutFilePath} --outputs-file-include-sensitive-outputs --ignore-missing-stack-dependencies`,
    'pretf@deploy:selection': `cdktf synth`,
    'tf@deploy:selection': `ts-node ./scripts/tf-deploy-selection.script.ts -c ${constants.paths.dirs.cdktfOutDir}`,
    'tf@plan': 'cdktf diff',
    'tf@clean': `rm -rf ${constants.paths.dirs.cdktfOutDir}`,
    'tf@install': `find ./${constants.paths.dirs.cdktfOutDir}/stacks/ -mindepth 1 -maxdepth 1 -type d | xargs -I {} -P 0 sh -c 'cd "{}" && terraform init'`,

    // Terminal
    terminal: 'ts-node ./scripts/terminal-v2.script.ts',
  });

  // Oci Private Key
  const apexCaptainOciPrivateKeyFile = new TextFile(
    project,
    path.join(constants.paths.dirs.keysDir, 'APEX_CAPTAIN_OCI_PRIVATE_KEY.pem'),
    {
      lines: process.env.APEX_CAPTAIN_OCI_PRIVATE_KEY?.split('\\n'),
      editGitignore: false,
    },
  );

  // Oci Cli Config
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
        {
          // https://registry.terraform.io/providers/hashicorp/external/latest
          name: 'external',
          source: 'hashicorp/external',
        },
        {
          // https://registry.terraform.io/providers/hashicorp/vault/latest
          name: 'vault',
          source: 'hashicorp/vault',
        },

        // Partners
        {
          // https://registry.terraform.io/providers/integrations/github/latest
          name: 'github',
          source: 'integrations/github',
        },
        {
          /**
           * @note
           * - 임시로 cloudflare 5.1.0 버전 사용
           * - 2025-04-09에 나온 5.3.0 버전에 이슈가 있는듯, 5월 말쯤 새 버전 나오면 다시 확인
           * @see: https://github.com/cloudflare/terraform-provider-cloudflare/releases
           */
          // https://registry.terraform.io/providers/cloudflare/cloudflare/latest
          name: 'cloudflare',
          source: 'cloudflare/cloudflare',
          version: '5.1.0',
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
      externalIpCidrBlocks: {
        apexCaptainHomeIpv4: `${workstationIpAddress}/32`,
        gjwoo960101Ipv4: process.env.EXTERNAL_IP_CIDR_BLOCK_GJWOO960101_IPV4!!,
        gjwoo960101Ipv6: process.env.EXTERNAL_IP_CIDR_BLOCK_GJWOO960101_IPV6!!,
        nayuntechCorpIpv4:
          process.env.EXTERNAL_IP_CIDR_BLOCK_NAYUNTECH_CORP_IPV4!!,
      },
      externalGithubUsers: {
        ApexCaptain: {
          githubUsername: process.env.GITHUB_APEX_CAPTAIN_USERNAME!!,
        },
        gjwoo960101: {
          githubUsername: process.env.GITHUB_GJWOO960101_USERNAME!!,
        },
      },
      stacks: {
        common: {
          generatedDockerConfigFileDirPath: path.join(
            constants.paths.dirs.secretsDir,
            'docker',
          ),
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
              nfs: {
                sftp: {
                  userName: process.env.OKE_NFS_APP_SFTP_USER_NAME!!,
                },
              },
              oauth2Proxy: {
                admin: {
                  clientId:
                    process.env.APEX_CAPTAIN_GITHUB_ADMIN_OAUTH_APP_CLIENT_ID!!,
                  clientSecret:
                    process.env
                      .APEX_CAPTAIN_GITHUB_ADMIN_OAUTH_APP_CLIENT_SECRET!!,
                },
                contributor: {
                  clientId:
                    process.env
                      .APEX_CAPTAIN_GITHUB_CONTRIBUTOR_OAUTH_APP_CLIENT_ID!!,
                  clientSecret:
                    process.env
                      .APEX_CAPTAIN_GITHUB_CONTRIBUTOR_OAUTH_APP_CLIENT_SECRET!!,
                },
              },
              keyCloackVaultProxy: {
                clientId:
                  process.env.APEX_CAPTAIN_GITHUB_VAULT_OAUTH_APP_CLIENT_ID!!,
                clientSecret:
                  process.env
                    .APEX_CAPTAIN_GITHUB_VAULT_OAUTH_APP_CLIENT_SECRET!!,
              },
              homeL2tpVpnProxy: {
                vpnServerAddr: workstationIpAddress,
                vpnIpsToRoute: (
                  await Promise.all(
                    [
                      process.env
                        .WORKSTATION_VPN_L2TP_IP_TO_ROUTE_FOR_WORKSTATION!!,
                      process.env
                        .WORKSTATION_VPN_L2TP_IP_TO_ROUTE_FOR_NAYUNTECH_SI_CERIK_HOMEPAGE!!,
                      process.env
                        .WORKSTATION_VPN_L2TP_IP_TO_ROUTE_FOR_NAYUNTECH_SI_KPBMA_RMS!!,
                      process.env
                        .WORKSTATION_VPN_L2TP_IP_TO_ROUTE_FOR_NAYUNTECH_IMPORT_EDI_PROD!!,
                      process.env
                        .WORKSTATION_VPN_L2TP_IP_TO_ROUTE_FOR_NAYUNTECH_IMPORT_EDI_DEV!!,
                    ].map(ip => dns.lookup(ip)),
                  )
                ).map(ip => ip.address),
                vpnGatewayIp: process.env.WORKSTATION_VPN_L2TP_GATEWAY_IP!!,
                vpnAccounts: [
                  {
                    username:
                      process.env
                        .WORKSTATION_VPN_L2TP_OKE_PORXY_SERVICE_USER_1_ACCOUNT!!,
                    password:
                      process.env
                        .WORKSTATION_VPN_L2TP_OKE_PORXY_SERVICE_USER_1_PASSWORD!!,
                  },
                  {
                    username:
                      process.env
                        .WORKSTATION_VPN_L2TP_OKE_PORXY_SERVICE_USER_2_ACCOUNT!!,
                    password:
                      process.env
                        .WORKSTATION_VPN_L2TP_OKE_PORXY_SERVICE_USER_2_PASSWORD!!,
                  },
                ],
              },
            },
          },
          workstation: {
            common: {
              domain: {
                iptime: process.env.WORKSTATION_COMMON_DOMAIN_IPTIME!!,
              },
            },
            apps: {
              longhorn: {
                nodes: [
                  {
                    name: process.env.WORKSTATION_NODE_0_NAME!!,
                    disks: [
                      {
                        name: process.env.WORKSTATION_NODE_0_DISK_0_NAME!!,
                        path: process.env.WORKSTATION_NODE_0_DISK_0_PATH!!,
                        diskType:
                          process.env.WORKSTATION_NODE_0_DISK_0_DISK_TYPE!!,
                        isSsd: JSON.parse(
                          process.env.WORKSTATION_NODE_0_DISK_0_IS_SSD!!,
                        ) as boolean,
                      },
                      {
                        name: process.env.WORKSTATION_NODE_0_DISK_1_NAME!!,
                        path: process.env.WORKSTATION_NODE_0_DISK_1_PATH!!,
                        diskType:
                          process.env.WORKSTATION_NODE_0_DISK_1_DISK_TYPE!!,
                        isSsd: JSON.parse(
                          process.env.WORKSTATION_NODE_0_DISK_1_IS_SSD!!,
                        ) as boolean,
                      },
                    ],
                  },
                ],
              },
              files: {
                sftp: {
                  userName: process.env.WORKSTATION_FILE_APP_SFTP_USER_NAME!!,
                },
              },
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
              email: process.env.APEX_CAPTAIN_CLOUDFLARE_EMAIL!!,
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
  new VsCode(project).settings.addSettings(
    flatley(
      {
        todohighlight: {
          toggleURI: true,
          isCaseSensitive: false,
          keywords: new VsCodeObject([
            { text: '@' + 'ToDo', color: 'red', backgroundColor: 'black' },
            { text: '@' + 'note', color: 'blue', backgroundColor: 'lightblue' },
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
              '*.crd.ts': 'kubernetes',
              '*.external.ts': 'coffee',
            }),
          },
          folders: {
            associations: new VsCodeObject({
              abstract: 'class',
              '.kube': 'kubernetes',
              kubectl: 'kubernetes',
              oke: 'kubernetes',
              crd: 'kubernetes',
              workstation: 'home',
              '.projen': 'project',
              'cdktf.out': 'terraform',
              terminal: 'command',
              ssh: 'command',
              external: 'admin',
              'dev-pods': 'development',
            }),
          },
        },
      },
      {
        safe: true,
        coercion: [
          {
            test: (_, value) => {
              return VsCodeObject.isVscodeObject(value);
            },
            transform: (value: VsCodeObject<any>) => value.object,
          },
        ],
      },
    ),
  );

  // mcp.json
  new JsonFile(project, constants.paths.files.mcpJsonFilePath, {
    obj: {
      mcpServers: {
        context7: {
          command: 'npx',
          args: [
            '-y',
            '@smithery/cli@latest',
            'run',
            '@upstash/context7-mcp',
            '--key',
            '$SMITHERY_APEX_CAPTAIN_API_KEY',
          ],
        },
      },
    },
  });

  project.postSynthesize = () => {
    execSync(`chmod 400 ${apexCaptainOciPrivateKeyFile.absolutePath}`);
    execSync(`chmod 600 ${ociCliConfigFile.absolutePath}`);
  };

  project.synth();
})();
