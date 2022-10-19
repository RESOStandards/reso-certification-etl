const {
  processLookupResourceMetadata,
  processLookupResourceMetadataFiles,
} = require("./lib/process-lookup-resource-metadata");

module.exports = {
  processLookupResourceMetadata,
  processLookupResourceMetadataFiles,
  processDataAvailability: require("./lib/process-data-availability"),
  processMetadata: require("./lib/process-metadata"),
  common: require("./lib/common"),
  processCucumberJson:
    require("./lib/process-cucumber-json").processCucumberJson(),
};
