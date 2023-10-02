import path from 'path';
import * as Joi from '@hapi/joi';
import deepmerge from 'deepmerge';
import { flatten } from 'flat';
import { IniFile, Project } from 'projen';
import { Auxiliary, DeepPartial } from '../module';
import 'joi-extract-type';

interface EnvironmentAuxiliaryConfig<Schema extends Joi.Schema> {
  envDirPath: string;
  committed?: boolean;
  envFilePrefix?: string;
  default?: DeepPartial<Joi.extractType<Schema>>;
  settings: {
    [key: string]: DeepPartial<Joi.extractType<Schema>>;
  };
}

interface EnvironmentAuxiliaryOutput {}

export class EnvironmentAuxiliary<Schema extends Joi.Schema> extends Auxiliary<
  Project,
  EnvironmentAuxiliaryConfig<Schema>,
  EnvironmentAuxiliaryOutput
> {
  constructor(project: Project, config: EnvironmentAuxiliaryConfig<Schema>) {
    super(project, config);
    const defaultConfig: DeepPartial<EnvironmentAuxiliaryConfig<Schema>> = {
      committed: false,
      default: {},
      envFilePrefix: '',
    };

    this.config = deepmerge(
      defaultConfig,
      config,
    ) as EnvironmentAuxiliaryConfig<Schema>;
  }

  async process(): Promise<EnvironmentAuxiliaryOutput> {
    Object.entries(this.config.settings).forEach(([key, value]) => {
      new IniFile(
        this.project,
        path.join(
          this.config.envDirPath,
          `${
            this.config.envFilePrefix ? `${this.config.envFilePrefix}.` : ''
          }${key}.env`,
        ),
        {
          obj: flatten(deepmerge(this.config.default!!, value), {
            delimiter: '_',
          }),
          committed: this.config.committed,
        },
      );
    });
    return {};
  }
}
