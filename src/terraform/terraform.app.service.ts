import { Injectable } from '@nestjs/common';
import { App } from 'cdktf';
import { TerraformInjectorFactory } from 'cdktf-injector';

@Injectable()
export class TerraformAppService {
  readonly cdktfApp = new App();
  async synth() {
    await TerraformInjectorFactory.scopesOnAsync(this.cdktfApp).inject();
    this.cdktfApp.synth();
  }
}
