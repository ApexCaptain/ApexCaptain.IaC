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
import { TerraformAppService } from '@/terraform/terraform.app.service';

export abstract class AbstractStack extends TerraformInjectorStackAsync {
  abstract terraform: {
    backend: TerraformInjectorElementContainerAsync<TerraformBackend, any>;
    providers?: {
      [key: string]: TerraformInjectorElementContainerAsync<
        TerraformProvider,
        any
      >;
    };
  };

  constructor(
    cdktfApp: App,
    protected readonly id: string,
    protected readonly description?: string,
  ) {
    super(cdktfApp, id, description);
  }
}
