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
