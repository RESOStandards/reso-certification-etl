const fs = require("fs/promises");
const { Buffer } = require("node:buffer");
const {
  processLookupResourceMetadata,
} = require("./lib/process-lookup-resource-metadata");

const writeFile = async (path, content = "") => {
  try {
    await fs.appendFile(path, Buffer.from(content));
  } catch (err) {
    console.log(err);
  }
};

const readFile = async (path = "") => {
  try {
    return await fs.readFile(path, { encoding: "utf8" });
  } catch (err) {
    console.log(err);
  }
};

const transformLookupResourceMetadata = async (
  pathToMetadataReportJson = "",
  pathToLookupResourceData = "",
  pathToOutputFile = ""
) => {
  const metadataReportJson = JSON.parse(
      await readFile(pathToMetadataReportJson)
    ),
    lookupResourceJson = JSON.parse(await readFile(pathToLookupResourceData));

  const results = processLookupResourceMetadata({
    metadataReportJson,
    lookupResourceJson,
  });

  await writeFile(pathToOutputFile, JSON.stringify(results));
};

module.exports = {
  transformLookupResourceMetadata,
  processDataAvailability: require("./lib/process-data-availability"),
  processMetadata: require("./lib/process-metadata"),
  common: require("./lib/common"),
};
