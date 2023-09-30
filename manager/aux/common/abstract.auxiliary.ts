import { Project } from 'projen';
export abstract class Auxiliary<
  ProjectType extends Project = Project,
  ConfigType = any,
  OutputType = any,
> {
  constructor(
    protected project: ProjectType,
    protected config: ConfigType,
  ) {}
  abstract process(): Promise<OutputType>;
}
