import path from 'path';
import {
  App,
  TerraformBackend,
  TerraformDataSource,
  TerraformProvider,
  TerraformResource,
} from 'cdktf';
import {
  TerraformInjectorElementContainerAsync,
  TerraformInjectorStackAsync,
} from 'cdktf-injector';

export abstract class AbstractStack extends TerraformInjectorStackAsync {
  protected abstract providers: {
    [key: string]: TerraformInjectorElementContainerAsync<
      TerraformProvider,
      any
    >;
  };

  protected abstract backends: {
    [key: string]: TerraformInjectorElementContainerAsync<
      TerraformBackend,
      any
    >;
  };

  abstract data: {
    [key: string]: TerraformInjectorElementContainerAsync<
      TerraformDataSource,
      any
    >;
  };

  abstract resources: {
    [key: string]: TerraformInjectorElementContainerAsync<
      TerraformResource,
      any
    >;
  };

  constructor(app: App, stackPath: string) {
    const relativeStackPaths = path
      .relative(process.cwd(), stackPath)
      .split('/');
    const id = relativeStackPaths
      .slice(relativeStackPaths.indexOf('stacks') + 1)
      .join('.');
    super(app, id);
  }
}
