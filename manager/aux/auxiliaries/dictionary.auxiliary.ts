/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'fs';
import path from 'path';
import deepmerge from 'deepmerge';
import { TypeScriptProject } from 'projen/lib/typescript';
import { Auxiliary, DeepPartial } from '../module';

export interface DictionaryAuxiliaryConfig {
  jsonDirPath: string;
  fileNamePrefixes?: Array<string>;
  contextPath?: string;
  severity?: 'off' | 'warn' | 'error';
  applyAuxDefaultDictionary?: boolean;
}

export interface DictionaryAuxiliaryOutput {}

export class DictionaryAuxiliary extends Auxiliary<
  TypeScriptProject,
  DictionaryAuxiliaryConfig,
  DictionaryAuxiliaryOutput
> {
  static DefaultDictionary = [
    'fs',
    'deepmerge',
    'outdir',
    'dic',
    'vscode',
    'flatley',
    'bitwise ',
    'ini',
  ];

  constructor(project: TypeScriptProject, config: DictionaryAuxiliaryConfig) {
    super(project, config);
    const defaultConfig: DeepPartial<DictionaryAuxiliaryConfig> = {
      fileNamePrefixes: ['app'],
      contextPath: project.outdir,
      severity: 'warn',
      applyAuxDefaultDictionary: true,
    };
    this.config = deepmerge(defaultConfig, config, {
      arrayMerge: (_, src) => src,
    });
  }
  async process(): Promise<DictionaryAuxiliaryOutput> {
    const { eslint } = this.project;
    if (!eslint)
      throw new Error(
        `Eslint is not configured on project ${this.project.name}`,
      );
    this.project.addDevDeps('eslint-plugin-spellcheck');
    eslint.addPlugins('spellcheck');
    const dictionary = new Set<string>(
      this.config.applyAuxDefaultDictionary
        ? DictionaryAuxiliary.DefaultDictionary
        : undefined,
    );

    const dirPath = path.join(
      this.config.contextPath!!,
      this.config.jsonDirPath,
    );

    const dicFilesPaths = this.config.fileNamePrefixes!!.map(eachFilePrefix =>
      path.join(dirPath, `${eachFilePrefix}.dic.json`),
    );

    if (!fs.existsSync(dirPath))
      fs.mkdirSync(dirPath, {
        recursive: true,
      });

    dicFilesPaths.forEach(eachDicFilePath => {
      if (!fs.existsSync(eachDicFilePath))
        fs.writeFileSync(eachDicFilePath, JSON.stringify([], null, 2));
      const words = [
        ...new Set(
          (require(eachDicFilePath) as Array<string>)
            .map(eachWord => eachWord.trim().toLowerCase())
            .sort(),
        ),
      ];
      fs.writeFileSync(eachDicFilePath, JSON.stringify(words, null, 2));
      words.forEach(eachWord => dictionary.add(eachWord));
    });

    eslint.addRules({
      'spellcheck/spell-checker': [
        this.config.severity,
        {
          skipWords: [...dictionary],
        },
      ],
    });

    return {};
  }
}
