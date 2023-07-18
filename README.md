# Amplify Studio - Clone components and collections to a new environment using AWS SDK.

AWS Amplify Studio is a visual development environment for building fullstack web and mobile apps. Which provides capabilities such as generating UI components from a Figma file.
While the UI components are a powerfull feature, Amplify Studio currently does not support cloning the components when cloning an existing environment.

The examples intents to provide a automated method for cloning the UI components using Amplify CLI hooks when adding a new environment or manually clone the componenets using [AWS SDK v3 Amplify UIBuilder library](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-amplifyuibuilder/). 


### Amplify CLI Hooks


We can automate the component creation when adding a new environment(`amplify add env`) using [Amplify CLI hooks](https://docs.amplify.aws/cli/project/command-hooks/#adding-a-command-hook).

with files such as `pre-add-env.js` to get the previous env name, `post-add-env.js` to get existing env name and appID 
to then perform the export and import actions.

1. Create a `pre-add-env.js` file under the `amplify/hooks` folder (create the folder if the hooks folder does not exist).
2. Add the following

```js
/**
 * This is a sample hook script created by Amplify CLI.
 * To start using this pre-push hook please change the filename:
 * pre-push.js.sample  ->  pre-push.js
 *
 * learn more: https://docs.amplify.aws/cli/usage/command-hooks
 */
import { writeFile, readFileSync } from "node:fs";
/**
 * @param data { { amplify: { environment: { envName: string, projectPath: string, defaultEditor: string }, command: string, subCommand: string, argv: string[] } } }
 * @param error { { message: string, stack: string } }
 */
const hookHandler = async (data, error) => {
  // TODO write your hook handler here
  const envName = data.amplify.environment.envName;

  // Prepare the JSON object to write
  let targetJson = {
    envName: envName,
  };

  // Write the JSON object to a new file
  writeFile("targetFile.json", JSON.stringify(targetJson, null, 2), (err) => {
    if (err) throw err;
    console.log("Data written to target file");
  });
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

```
3. Create `post-add-env.js` under the `amplify/hooks` folder
4. Add the following

```js
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
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 sec before next request
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

```

5. Add a `package.json` file with the following

```
{
  "name": "createcomponents",
  "version": "1.0.0",
  "description": "Recreate Amplify Studio components in new environment with components from older environment",
  "main": "index.js",
  "dependencies": {
    "@aws-sdk/client-amplifyuibuilder": "^3.32.0"
  },
  "type": "module",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "ISC"
}

```

6. Run `amplify add env` and observe the hooks run.
7. (Optional) Run `amplify push` if the env has GraphQL API and your components have data binding.

### Manual

1. In a new directory, run `npm init`
2. Create a `index.js` file and add the following.

```js
import {
  AmplifyUIBuilderClient,
  ExportComponentsCommand,
  CreateComponentCommand,
} from "@aws-sdk/client-amplifyuibuilder";

const client = new AmplifyUIBuilderClient({ region: "region" }); // e.g. 'us-east-1' and auth config as needed

// export components from old environment

const input = {
  appId: "app-id", // Amplify AppID
  environmentName: "env-name", // Amplify env name (one you would like to export from)
};

const command = new ExportComponentsCommand(input);

async function exportComponents() {
  const response = await client.send(command);
  return response;
}

const data = await exportComponents();

// create components in new environment

const components = data.entities.map((entity) => {
  return {
    appId: "app-id", // required
    environmentName: "env-name", // required Amplify env name (one you would like to import to)
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
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before next request
  const command = new CreateComponentCommand(component);
  await client.send(command).catch((err) => {
    console.log(err);
  });
}
```

3. Edit the values region, `app-id` and `env-name`. 
4. Add the `package.json` dependencies and type as in the example

```json
{
  "name": "createcomponents",
  "version": "1.0.0",
  "description": "Recreate Amplify Studio components in new environment with components from older environment",
  "main": "index.js",
  "dependencies": {
    "@aws-sdk/client-amplifyuibuilder": "^3.32.0"
  },
  "type": "module",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "ISC"
}
```

5. Run `npm install` to install the packages
6. Run `node index.js`

### Note

The components being created will create the underlying props and data model bindings, if you open a component that has data model bindings you may observe an error. You may have to re-create the same data model in the new environment, modify the binding properties to not create the bindings or remove the binding on a component in Amplify Studio.   


## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

