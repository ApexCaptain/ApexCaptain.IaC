import deepmerge from 'deepmerge';
import { Project } from 'projen';
import { VsCode } from 'projen/lib/vscode';
import { Auxiliary, DeepPartial, flatley } from '../module';

export class VsCodeSettingsObject<ObjectType extends Object> {
  static isVscodeObject(target: any): target is VsCodeSettingsObject<any> {
    return (
      typeof target == 'object' &&
      '__projen_aux_object_key' in target &&
      (target as VsCodeSettingsObject<any>).__projen_aux_object_key ==
        VsCodeSettingsObject.__projen_aux_object_key
    );
  }
  private static __projen_aux_object_key = '__PROJEN_AUX_OBJECT_KEY' as const;
  private __projen_aux_object_key =
    VsCodeSettingsObject.__projen_aux_object_key;
  constructor(readonly object: ObjectType) {}
}

export interface VsCodeSettingsAuxiliaryConfig {
  settings?: {
    [key: string]: any;
  };
  languages?: string | string[];
}

export interface VsCodeSettingsAuxiliaryOutput {}

export class VsCodeSettingsAuxiliary extends Auxiliary<
  Project,
  VsCodeSettingsAuxiliaryConfig,
  VsCodeSettingsAuxiliaryOutput
> {
  constructor(project: Project, config: VsCodeSettingsAuxiliaryConfig) {
    super(project, config);
    const defaultConfig: DeepPartial<VsCodeSettingsAuxiliaryConfig> = {
      settings: {},
    };
    this.config = deepmerge(defaultConfig, config);
  }

  async process(): Promise<VsCodeSettingsAuxiliaryOutput> {
    const vscode = new VsCode(this.project);
    vscode.settings.addSettings(
      flatley(this.config.settings, {
        safe: true,
        coercion: [
          {
            test: (_, value) => {
              return VsCodeSettingsObject.isVscodeObject(value);
            },
            transform: (value: VsCodeSettingsObject<any>) => value.object,
          },
        ],
      }),
      this.config.languages,
    );
    return {};
  }
}
