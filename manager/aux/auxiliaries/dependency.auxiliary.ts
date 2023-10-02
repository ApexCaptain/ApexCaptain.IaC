/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'fs';
import path from 'path';
import deepmerge from 'deepmerge';
import { NodeProject } from 'projen/lib/javascript';
import { Auxiliary, DeepPartial } from '../module';

export interface DependencyAuxiliaryConfig {
  jsonDirPath: string;
  fileNamePrefix: string;
  contextPath?: string;
}
export interface DependencyAuxiliaryOutput {
  deps: Array<string>;
  devDeps: Array<string>;
}

export class DependencyAuxiliary extends Auxiliary<
  NodeProject,
  DependencyAuxiliaryConfig,
  DependencyAuxiliaryOutput
> {
  constructor(project: NodeProject, config: DependencyAuxiliaryConfig) {
    super(project, config);
    const defaultConfig: DeepPartial<DependencyAuxiliaryConfig> = {
      contextPath: project.outdir,
    };
    this.config = deepmerge(defaultConfig, config);
  }

  async process(): Promise<DependencyAuxiliaryOutput> {
    const dirPath = path.join(
      this.config.contextPath!!,
      this.config.jsonDirPath,
    );

    const depsFilePath = path.join(
      dirPath,
      `${this.config.fileNamePrefix}.deps.json`,
    );
    const devDepsFilePath = path.join(
      dirPath,
      `${this.config.fileNamePrefix}.devDeps.json`,
    );

    if (!fs.existsSync(dirPath))
      fs.mkdirSync(dirPath, {
        recursive: true,
      });

    if (!fs.existsSync(depsFilePath))
      fs.writeFileSync(depsFilePath, JSON.stringify([], null, 2));
    if (!fs.existsSync(devDepsFilePath))
      fs.writeFileSync(devDepsFilePath, JSON.stringify([], null, 2));

    const deps = [...new Set((require(depsFilePath) as Array<string>).sort())];
    const devDeps = [
      ...new Set((require(devDepsFilePath) as Array<string>).sort()),
    ];

    fs.writeFileSync(depsFilePath, JSON.stringify(deps, null, 2));
    fs.writeFileSync(devDepsFilePath, JSON.stringify(devDeps, null, 2));

    this.project.addDeps(...deps);
    this.project.addDevDeps(...devDeps);

    return {
      deps,
      devDeps,
    };
  }
}
