const {
  processLookupResourceMetadata,
  processLookupResourceMetadataFiles,
} = require('./lib/process-lookup-resource-metadata');

const getReferenceMetadata = (version = '1.7') => {
  try {
    return require(`./lib/references/dd-${version}/metadata-report.json`);
  } catch (err) {
    console.error("Cannot load reference metadata. ERROR: " + err);
    return null;
  }
};

module.exports = {
  processLookupResourceMetadata,
  processLookupResourceMetadataFiles,
  processDataAvailability: require('./lib/process-data-availability'),
  processMetadata: require('./lib/process-metadata'),
  common: require('./lib/common'),
  processCucumberJson: require('./lib/process-cucumber-json'),
  getReferenceMetadata
};
