import { Fn } from 'cdktf';
import deepmerge from 'deepmerge';
import path from 'path';
export abstract class AbstractTemplate<T_Vars> {
  abstract templateFileName: string;

  abstract defaultVars: Required<T_Vars>;

  render(vars: Partial<T_Vars>) {
    return Fn.templatefile(
      path.join(process.cwd(), 'assets', 'templates', this.templateFileName),
      deepmerge(this.defaultVars, vars),
    );
  }
}
