import { loadConfig } from "../../src/config.js";
import { getSeed } from "../../src/utils/index.js";
import program from "../cli.js";

import { deploy, DeployConfig } from "../../src/deploy.js";

const deployCommand = program
  .command("deploy")
  .description("Deploy Ada Handle Marketplace SC")
  .argument("<handle-name>", "Ada Handle Name to deploy with SC")
  .action(async (handleName: string) => {
    const seed = await getSeed(program);
    const configResult = loadConfig();
    if (!configResult.ok) return program.error(configResult.error);
    const config = configResult.data;

    const deployConfig: DeployConfig = {
      seed,
      handleName,
    };

    await deploy(deployConfig, config.network, config.blockfrostApiKey);
  });

export default deployCommand;
