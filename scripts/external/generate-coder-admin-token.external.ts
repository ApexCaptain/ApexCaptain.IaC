import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Option } from 'commander';
import dedent from 'dedent';
import puppeteer from 'puppeteer';
import wait from 'wait';
import { ExternalProgramOutput, ExternalProgram } from './abstract.external';

interface ExternalGenerateCoderAdminTokenOptions {
  kubeconfig?: string;
  httpsProxy?: string;
  namespace: string;
  coderServerUrl: string;
  coderPodLabelKey: string;
  coderPodLabelValue: string;
  adminUserEmail: string;
  adminUserPassword: string;
  tokenName: string;
  refreshTokenBeforeExpirationHours: number;
  storedTokenSecretFileName: string;
}

interface ExternalGenerateCoderAdminTokenOutput extends ExternalProgramOutput {
  token: string;
}
interface TokenInfo {
  id: string;
  user_id: string;
  last_used: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  login_type: string;
  scope: string;
  scopes: string[];
  lifetime_seconds: number;
  allow_list: string[];
  token_name: string;
}
export class ExternalGenerateCoderAdminToken extends ExternalProgram<
  ExternalGenerateCoderAdminTokenOptions,
  ExternalGenerateCoderAdminTokenOutput
> {
  private readonly staticSecretTokenStorePath = path.join(
    process.env.CONTAINER_SECRETS_DIR_PATH!!,
    'tokens',
    `${this.option.storedTokenSecretFileName}.json`,
  );

  private storedTokens: { id: string; token: string }[] = [];

  constructor() {
    super(ExternalGenerateCoderAdminToken.name, [
      new Option('--kubeconfig <path>', 'The path to the kubeconfig file'),
      new Option('--https-proxy <url>', 'The https proxy url'),
      new Option(
        '--namespace <name>',
        'The namespace of the target longhorn node',
      ).makeOptionMandatory(),
      new Option(
        '--coder-server-url <url>',
        'The url of the coder server',
      ).makeOptionMandatory(),
      new Option(
        '--coder-pod-label-key <key>',
        'The key of the coder pod label',
      ).makeOptionMandatory(),
      new Option(
        '--coder-pod-label-value <value>',
        'The value of the coder pod label',
      ).makeOptionMandatory(),
      new Option(
        '--admin-user-email <email>',
        'The email of the admin user',
      ).makeOptionMandatory(),
      new Option(
        '--admin-user-password <password>',
        'The password of the admin user',
      ).makeOptionMandatory(),
      new Option(
        '--token-name <name>',
        'The name of the token',
      ).makeOptionMandatory(),
      new Option(
        '--refresh-token-before-expiration-hours <hours>',
        'The number of hours before the token expires to refresh it',
      )
        .argParser(value => parseInt(value))
        .makeOptionMandatory(),
      new Option(
        '--stored-token-secret-file-name <filename>',
        'The name of the stored token secret file',
      ).makeOptionMandatory(),
    ]);
    if (!fs.existsSync(this.staticSecretTokenStorePath)) {
      fs.mkdirSync(path.dirname(this.staticSecretTokenStorePath), {
        recursive: true,
      });
      fs.writeFileSync(this.staticSecretTokenStorePath, '[]');
    }
    this.storedTokens = JSON.parse(
      fs.readFileSync(this.staticSecretTokenStorePath, 'utf8'),
    );
  }

  private saveTokenToSecret(id: string, token: string) {
    this.storedTokens.push({ id, token });
    fs.writeFileSync(
      this.staticSecretTokenStorePath,
      JSON.stringify(this.storedTokens, null, 2),
    );
  }
  private deleteTokenFromSecret(id: string) {
    this.storedTokens = this.storedTokens.filter(
      eachToken => eachToken.id !== id,
    );
    fs.writeFileSync(
      this.staticSecretTokenStorePath,
      JSON.stringify(this.storedTokens, null, 2),
    );
  }
  private clearTokensFromSecret() {
    this.storedTokens = [];
    fs.writeFileSync(
      this.staticSecretTokenStorePath,
      JSON.stringify(this.storedTokens, null, 2),
    );
  }

  async execute(): Promise<ExternalGenerateCoderAdminTokenOutput> {
    const {
      kubeconfig,
      httpsProxy,
      namespace,
      coderServerUrl,
      coderPodLabelKey,
      coderPodLabelValue,
      adminUserEmail,
      adminUserPassword,
      tokenName,
      refreshTokenBeforeExpirationHours,
    } = this.option;

    const kubectlCommand = `kubectl ${kubeconfig ? `--kubeconfig=${kubeconfig}` : ''} ${httpsProxy ? `--proxy=${httpsProxy}` : ''}`;

    const targetPodName = await (async () => {
      while (true) {
        const podName = execSync(
          dedent`
          ${kubectlCommand} get pod \
             -n ${namespace} \
             -l ${coderPodLabelKey}=${coderPodLabelValue} \
             --field-selector=status.phase=Running \
             -o jsonpath='{.items[0].metadata.name}'
        `,
          {
            stdio: ['ignore', 'pipe', 'ignore'],
          },
        ).toString();
        if (podName) return podName;
        await wait(5000);
      }
    })();

    try {
      execSync(
        dedent`
        ${kubectlCommand} exec -n ${namespace} ${targetPodName} -- coder login  
      `,
        {
          stdio: ['ignore', 'pipe', 'ignore'],
        },
      );
    } catch (error) {}

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: '/usr/local/bin/chrome',
    });
    await browser.setPermission(coderServerUrl, {
      permission: { name: 'clipboard-read' },
      state: 'granted',
    });

    const page = await browser.newPage();
    await page.goto(`${coderServerUrl}/cli-auth`);
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.type('#email', adminUserEmail);
    await page.type('#password', adminUserPassword);
    await page.click('button[type="submit"]');

    const copySessionButtonSelector = 'button[type="button"]';
    await page.waitForSelector(copySessionButtonSelector);
    while (true) {
      if (
        (await page.$eval(copySessionButtonSelector, el => el.textContent)) ===
        'Copy session token'
      ) {
        break;
      }
    }
    await page.click(copySessionButtonSelector);
    const sessionToken = await page.evaluate(
      () => (navigator as any).clipboard.readText() as Promise<string>,
    );

    const prevToken = (
      JSON.parse(
        execSync(
          dedent`
            coder login ${coderServerUrl} > /dev/null
            coder tokens ls --include-expired -o json
          `,
          {
            stdio: ['ignore', 'pipe', 'ignore'],
            env: {
              CODER_SESSION_TOKEN: sessionToken,
            },
          },
        ).toString(),
      ) as [TokenInfo]
    ).find(eachToken => eachToken.token_name === tokenName);

    if (prevToken) {
      const expirationDate = new Date(prevToken.expires_at);
      const now = new Date();
      const timeDiff = expirationDate.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      const storedToken = this.storedTokens.find(
        eachToken => eachToken.id === prevToken.id,
      );

      if (hoursDiff < refreshTokenBeforeExpirationHours || !storedToken) {
        execSync(
          dedent`
            coder login ${coderServerUrl} > /dev/null
            coder token rm ${prevToken.id} --delete
          `,
          {
            stdio: ['ignore', 'pipe', 'ignore'],
            env: {
              CODER_SESSION_TOKEN: sessionToken,
            },
          },
        );
        this.deleteTokenFromSecret(prevToken.id);
      } else {
        return {
          token: storedToken.token,
        };
      }
    } else {
      this.clearTokensFromSecret();
    }

    const generatedTokenValue = execSync(
      dedent`
        coder login ${coderServerUrl} > /dev/null
        coder token create --name=${tokenName} --lifetime=168h
      `,
      {
        stdio: ['ignore', 'pipe', 'ignore'],
        env: {
          CODER_SESSION_TOKEN: sessionToken,
        },
      },
    )
      .toString()
      .replace(/\n/g, '');

    const generatedTokenInfo = JSON.parse(
      execSync(
        dedent`
        coder login ${coderServerUrl} > /dev/null
        coder token view ${tokenName} -o json
      `,
        {
          stdio: ['ignore', 'pipe', 'ignore'],
          env: {
            CODER_SESSION_TOKEN: sessionToken,
          },
        },
      ).toString(),
    )[0] as TokenInfo;

    this.saveTokenToSecret(generatedTokenInfo.id, generatedTokenValue);

    try {
      return {
        token: generatedTokenValue,
      };
    } finally {
      await page.close();
      await browser.close();
    }
  }
}
void new ExternalGenerateCoderAdminToken().run();
