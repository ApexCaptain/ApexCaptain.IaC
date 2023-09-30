import { Module } from '@nestjs/common';
import { ApexCaptainModule } from './ApexCaptain/ApexCaptain.module';

@Module({
  imports: [ApexCaptainModule],
})
export class GithubModule {}
