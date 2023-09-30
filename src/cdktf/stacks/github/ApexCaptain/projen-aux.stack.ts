import path from 'path';
import { Injectable } from '@nestjs/common';
import { AppCdktfService } from '@cdktf/app.cdktf.service';
import { AbstractStack } from '@common';
import { File } from '@terraform/providers/local/file';
import { LocalProvider } from '@terraform/providers/local/provider';

@Injectable()
export class ProjenAuxStack extends AbstractStack {
  protected providers = {
    local: this.provide(LocalProvider, 'local-provider', () => ({})),
  };

  protected backends = {};

  data = {};

  resources = {
    tmpFile: this.provide(File, 'tmp-file', () => ({
      content: 'sample',
      filename: path.join(process.cwd(), 'tmp', 'tmp.txt'),
    })),
  };

  constructor(
    // Global
    readonly appCdktfService: AppCdktfService,
  ) {
    super(appCdktfService.cdktfApp, __filename);
  }
}
