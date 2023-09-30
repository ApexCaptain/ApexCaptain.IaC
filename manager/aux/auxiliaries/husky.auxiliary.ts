import fs from 'fs';
import path from 'path';
import deepmerge from 'deepmerge';
import * as husky from 'husky';
import { Project } from 'projen';
import { Auxiliary, DeepPartial } from '../common';

export interface HuskyAuxiliaryConfig {
  huskyDirPath?: string;
  gitIgnoreHooks?: boolean;
  hooks?: {
    'applypatch-msg'?: Array<string>;
    'post-update'?: Array<string>;
    'pre-commit'?: Array<string>;
    'pre-rebase'?: Array<string>;
    'prepare-commit-msg'?: Array<string>;
    'commit-msg'?: Array<string>;
    'pre-applypatch'?: Array<string>;
    'pre-push'?: Array<string>;
    'pre-receive'?: Array<string>;
    update?: Array<string>;
  };
}

export interface HuskyAuxiliaryOutput {}

export class HuskyAuxiliary extends Auxiliary<
  Project,
  HuskyAuxiliaryConfig,
  HuskyAuxiliaryOutput
> {
  constructor(project: Project, config: HuskyAuxiliaryConfig) {
    super(project, config);
    const defaultConfig: DeepPartial<HuskyAuxiliaryConfig> = {
      huskyDirPath: '.husky',
      gitIgnoreHooks: true,
      hooks: {
        'applypatch-msg': [],
        'post-update': [],
        'pre-commit': [],
        'pre-rebase': [],
        'prepare-commit-msg': [],
        'commit-msg': [],
        'pre-applypatch': [],
        'pre-push': [],
        'pre-receive': [],
        update: [],
      },
    };
    this.config = deepmerge(defaultConfig, config, {
      arrayMerge: (_, src) => src,
    });
  }

  async process(): Promise<HuskyAuxiliaryOutput> {
    husky.uninstall();
    husky.install(this.config.huskyDirPath);
    if (this.config.hooks) {
      Object.entries(this.config.hooks).forEach(([key, cmdArray]) => {
        const fileAbsPath = path.join(
          this.project.outdir,
          this.config.huskyDirPath!!,
          key,
        );

        if (this.config.gitIgnoreHooks)
          this.project.addGitIgnore(
            path.relative(this.project.outdir, fileAbsPath),
          );

        if (cmdArray.length)
          husky.set(
            path.join(this.config.huskyDirPath!!, key),
            cmdArray.join('\n'),
          );
        else if (fs.existsSync(fileAbsPath)) fs.rmSync(fileAbsPath);
      });
    }
    return {};
  }
}
