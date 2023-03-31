const {
  processLookupResourceMetadata,
  processLookupResourceMetadataFiles,
} = require('./lib/process-lookup-resource-metadata');

const ddMetadata_1_7 = require('./lib/references/dd-1.7/metadata-report.json');

module.exports = {
  processLookupResourceMetadata,
  processLookupResourceMetadataFiles,
  processDataAvailability: require('./lib/process-data-availability'),
  processMetadata: require('./lib/process-metadata'),
  common: require('./lib/common'),
  processCucumberJson: require('./lib/process-cucumber-json'),
  ddMetadata_1_7
};
