import { typescript } from "projen";

const project = new typescript.TypeScriptAppProject({
  defaultReleaseBranch: "main",
  name: "ApexCaptain.IaC",
  projenrcTs: true,
});
project.synth();
