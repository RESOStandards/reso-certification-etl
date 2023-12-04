const { daReport } = require('./sample-data-availability-reports/availability-report');
const expectedReport = require('./sample-data-availability-reports/expected-availability-report.json');
const {
  processDataAvailability: { processDataAvailability }
} = require('..');
const assert = require('assert');

describe('processDataAvailability', function () {
  it('should match the expected data', async () => {
    const processedReport = await processDataAvailability(daReport);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(processedReport)), expectedReport);
  });
});
