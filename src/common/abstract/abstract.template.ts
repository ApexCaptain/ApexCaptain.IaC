import { Fn } from 'cdktf';
import deepmerge from 'deepmerge';
export abstract class AbstractTemplate<T_Vars> {
  abstract templateFilePath: string;

  abstract defaultVars: Required<T_Vars>;

  render(vars: T_Vars) {
    return Fn.templatefile(
      this.templateFilePath,
      deepmerge(this.defaultVars, vars),
    );
  }
}
