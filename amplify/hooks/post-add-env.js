import { readFileSync } from "node:fs";
import tpi from "../team-provider-info.json" assert { type: "json" };

import {
  AmplifyUIBuilderClient,
  ExportComponentsCommand,
  CreateComponentCommand,
} from "@aws-sdk/client-amplifyuibuilder";

/**
 * @param data { { amplify: { environment: { envName: string, projectPath: string, defaultEditor: string }, command: string, subCommand: string, argv: string[] } } }
 * @param error { { message: string, stack: string } }
 */

async function componentsSync(prevEnv, presentEnv, appID, Region) {
  const client = new AmplifyUIBuilderClient({ region: Region }); // e.g. 'us-east-1' and auth config as needed
  // export components from old environment

  const input = {
    appId: appID, // Amplify AppID
    environmentName: prevEnv, // Amplify env name (one you would like to export from)
  };
  const command = new ExportComponentsCommand(input);
  async function exportComponents() {
    try {
      const response = await client.send(command);
      return response;
    } catch (err) {
      console.log(err);
    }
  }

  const data = await exportComponents();
  // create components in new environment

  const components = data.entities.map((entity) => {
    return {
      appId: appID, // required
      environmentName: presentEnv, // required Amplify env name (one you would like to import to)
      componentToCreate: {
        name: entity.name, // required
        componentType: entity.componentType, // required
        properties: entity.properties, // required
        children: entity.children, // required
        variants: entity.variants, // required
        overrides: entity.overrides, // required
        bindingProperties: entity.bindingProperties, // required
        events: entity.events, // required
        sourceId: entity.sourceId, // optional
        schemaVersion: entity.schemaVersion, // optional
        collectionProperties: entity.collectionProperties, // optional
        tags: entity.tags, // optional
      },
    };
  });

  // added timeout to avoid throttling
  for (const component of components) {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait i seconds before next request
    const command = new CreateComponentCommand(component);
    await client.send(command).catch((err) => {
      console.log(err);
    });
  }
  return;
}

const hookHandler = async (data, error) => {
  console.log("Recreate components in new environment");
  const envName = data.amplify.environment.envName;
  const AmplifyAppId = tpi[envName].awscloudformation.AmplifyAppId;
  const Region = tpi[envName].awscloudformation.Region;

  try {
    let fileData = readFileSync("../../targetFile.json");
    let json = JSON.parse(fileData);
    let prevenvName = json.envName;

    await componentsSync(prevenvName, envName, AmplifyAppId, Region).then(
      console.log("Components recreated in new environment")
    );
  } catch (err) {
    console.error(err);
  }
};

const getParameters = async () => {
  return JSON.parse(readFileSync(0, { encoding: "utf8" }));
};

getParameters()
  .then((event) => hookHandler(event.data, event.error))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
