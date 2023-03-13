const fs = require('fs');
const { processCucumberJson: processCucumber } = require('../index');
const { parseErrorLog, processCucumberJson } = processCucumber;
const passedOnlyReport = require('./sample-reports/cucumber-passed-only.json');
const errorOnlyReport = require('./sample-reports/cucumber-error-only.json');
const errorAndPassed = require('./sample-reports/cucumber-passed-error.json');
// Import the assert library
const assert = require('assert');

const errorLog = fs.readFileSync(`${__dirname}/sample-reports/error.log.txt`).toString();
const errorLogMultiline = fs
  .readFileSync(`${__dirname}/sample-reports/error.multiline.log.txt`)
  .toString();

describe('processCucumberJson', function () {
  it('should not find an error when the raw report does not have an error step', async function () {
    const expected = { cucumberReport: [], errorLog: [] };
    const result = await processCucumberJson({
      cucumberReport: passedOnlyReport
    });
    assert.deepStrictEqual(result, expected);
  });

  it('should find an error when the raw report has an error step', async function () {
    const expected = {
      cucumberReport: [
        {
          stepName:
            'RESO Lookups using String or String Collection data types MUST have the annotation "RESO.OData.Metadata.LookupName"',
          message:
            // eslint-disable-next-line quotes
            "The following fields are missing the required 'RESO.OData.Metadata.LookupName' annotation: \n" +
            'CountyOrParish, StreetDirSuffix, City, StateOrProvince, StreetDirPrefix, StreetSuffix'
        }
      ],
      errorLog: []
    };
    const result = await processCucumberJson({
      cucumberReport: errorOnlyReport
    });
    assert.deepStrictEqual(result, expected);
  });

  it('should find an error when the raw report has an error and passed steps', async function () {
    const expected = {
      cucumberReport: [
        {
          stepName:
            'RESO Lookups using String or String Collection data types MUST have the annotation "RESO.OData.Metadata.LookupName"',
          message:
            // eslint-disable-next-line quotes
            "The following fields are missing the required 'RESO.OData.Metadata.LookupName' annotation: \n" +
            'CountyOrParish, StreetDirSuffix, City, StateOrProvince, StreetDirPrefix, StreetSuffix'
        }
      ],
      errorLog: []
    };
    const result = await processCucumberJson({
      cucumberReport: errorAndPassed
    });
    assert.deepStrictEqual(result, expected);
  });
});

describe('parseErrorLog', function () {
  it('should parse a single line error log', function () {
    const expected = [
      {
        testStep: 'LookupResource',
        message:
          // eslint-disable-next-line quotes
          "The following fields are missing the required 'RESO.OData.Metadata.LookupName' annotation: \n" +
          'CountyOrParish, StreetDirSuffix, City, StateOrProvince, StreetDirPrefix, StreetSuffix'
      }
    ];
    const result = parseErrorLog(errorLog);
    assert.deepStrictEqual(result, expected);
  });

  it('should parse multi-line error log', function () {
    const expected = [
      {
        testStep: 'DataAvailability',
        message:
          'Request to https://retsapi.raprets.com/2/bari/RESO/OData/Resource?$filter=DateTimeStamp lt 2022-12-19T22:20:02.461Z&$orderby=DateTimeStamp desc&$top=100 failed! No response code was provided. Check commander.log for any errors...'
      },
      {
        testStep: 'DataAvailability',
        message:
          'Request to https://retsapi.raprets.com/2/bari/RESO/OData/History?$filter=ModificationTimestamp lt 2022-12-19T22:21:05.499Z&$orderby=ModificationTimestamp desc&$top=100 failed! No response code was provided. Check commander.log for any errors...'
      },
      {
        testStep: 'DataAvailability',
        message:
          'Request to https://retsapi.raprets.com/2/bari/RESO/OData/Offices?$filter=ModificationTimestamp lt 2022-12-19T22:23:08.573Z&$orderby=ModificationTimestamp desc&$top=100 failed! No response code was provided. Check commander.log for any errors...'
      },
      {
        testStep: 'PayloadSampleReport',
        message:
          'Could not parse date for field MediaModificationTimestamp, with value: 2022-12-19 14:14:51.0. Expected ISO 8601 timestamp format!'
      }
    ];
    const result = parseErrorLog(errorLogMultiline);
    assert.deepStrictEqual(result, expected);
  });
});
