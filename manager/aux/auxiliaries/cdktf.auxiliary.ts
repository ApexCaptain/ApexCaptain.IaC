import deepmerge from 'deepmerge';
import { JsonFile, Project } from 'projen';
import { Auxiliary, DeepPartial } from '../common';

type CdktfDependency =
  | string
  | {
      readonly name: string; // name of the module / provider
      readonly source?: string; // path / url / registry identifier for the module / provider
      readonly version?: string; // version constraint (https://www.terraform.io/docs/language/providers/requirements.html#version-constraints)
    };

export interface CdktfAuxiliaryConfig {
  readonly cdktfJsonFilePath?: string;
  readonly gitIgnoreCdktfJson?: boolean;
  readonly gitIgnoreGeneratedDeps?: boolean;
  readonly gitIgnoreOutput?: boolean;
  readonly cdktfJsonConfig: {
    readonly app: string; // The command to run in order to synthesize the code to Terraform compatible JSON
    readonly language: 'typescript' | 'python' | 'csharp' | 'java' | 'go'; // Target language for building provider or module bindings. Currently supported: `typescript`, `python`, `java`, `csharp`, and `go`
    readonly output?: string; // Default: 'cdktf.out'. Where the synthesized JSON should go. Also will be the working directory for Terraform operations
    readonly codeMakerOutput?: string; // Default: '.gen'. Path where generated provider bindings will be rendered to.
    readonly projectId: string; // Default: generated UUID. Unique identifier for the project used to differentiate projects
    readonly sendCrashReports?: boolean; // Default: false. Whether to send crash reports to the CDKTF team
    readonly terraformProviders?: CdktfDependency[]; // Terraform Providers to build
    readonly terraformModules?: CdktfDependency[]; // Terraform Modules to build
    readonly context?: {
      [key: string]: boolean;
    };
  };
}

export interface CdktfAuxiliaryOutput {}

export class CdktfAuxiliary extends Auxiliary<
  Project,
  CdktfAuxiliaryConfig,
  CdktfAuxiliaryOutput
> {
  constructor(project: Project, config: CdktfAuxiliaryConfig) {
    super(project, config);
    const defaultConfig: DeepPartial<CdktfAuxiliaryConfig> = {
      cdktfJsonFilePath: 'cdktf.json',
      gitIgnoreCdktfJson: true,
      gitIgnoreGeneratedDeps: true,
      gitIgnoreOutput: true,
      cdktfJsonConfig: {
        output: 'cdktf.out',
        codeMakerOutput: '.gen',
        sendCrashReports: false,
      },
    };
    this.config = deepmerge(defaultConfig, config) as CdktfAuxiliaryConfig;
  }

  async process(): Promise<CdktfAuxiliaryOutput> {
    if (this.config.cdktfJsonFilePath) {
      new JsonFile(this.project, this.config.cdktfJsonFilePath, {
        obj: this.config.cdktfJsonConfig,
        editGitignore: false,
      });

      if (this.config.gitIgnoreCdktfJson)
        this.project.gitignore.addPatterns(this.config.cdktfJsonFilePath);

      if (this.config.gitIgnoreOutput && this.config.cdktfJsonConfig.output)
        this.project.gitignore.addPatterns(this.config.cdktfJsonConfig.output);

      if (
        this.config.gitIgnoreGeneratedDeps &&
        this.config.cdktfJsonConfig.codeMakerOutput
      )
        this.project.gitignore.addPatterns(
          this.config.cdktfJsonConfig.codeMakerOutput,
        );
    }

    return {};
  }
}
