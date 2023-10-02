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

  protected abstract backendConfig: TerraformInjectorElementContainerAsync<
    TerraformBackend,
    any
  >;

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

  constructor(
    app: App,
    protected id: string,
    protected description?: string,
  ) {
    super(app, id, description);
  }
}
