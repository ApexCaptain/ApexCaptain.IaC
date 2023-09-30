import { Module } from '@nestjs/common';
import { GithubModule as StacksGithubModule } from './github/github.module';

@Module({
  imports: [StacksGithubModule],
})
export class StacksModule {}
