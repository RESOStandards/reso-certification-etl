const { reportTypes } = require('../../lib/common');

const daReport = {
  description: 'RESO Data Availability Report',
  version: '1.7',
  generatedOn: '2022-03-15T10:12:32.319Z',
  type: reportTypes.DATA_AVAILABILITY.name,
  resources: [
    {
      resourceName: 'Office',
      recordCount: 1000,
      numRecordsFetched: 1000,
      numSamples: 10,
      pageSize: 100,
      averageResponseBytes: 100000,
      averageResponseTimeMillis: 1500,
      dateField: 'ModificationTimestamp',
      dateLow: '2021-03-15T10:12:32.319Z',
      dateHigh: '2022-03-15T10:12:32.319Z',
      keyFields: ['OfficeKey']
    },
    {
      resourceName: 'Property',
      recordCount: 1000,
      numRecordsFetched: 1000,
      numSamples: 10,
      pageSize: 100,
      averageResponseBytes: 100000,
      averageResponseTimeMillis: 2000,
      dateField: 'ModificationTimestamp',
      dateLow: '2021-03-15T10:12:32.319Z',
      dateHigh: '2022-03-15T10:12:32.319Z',
      keyFields: ['ListingKey'],
      postalCodes: ['12345', '67890']
    }
  ],
  fields: [
    {
      resourceName: 'Office',
      fieldName: 'OfficeStateOrProvince',
      frequency: 1000
    },
    {
      resourceName: 'Property',
      fieldName: 'AccessibilityFeatures',
      frequency: 2000
    },
    {
      resourceName: 'Property',
      fieldName: 'StandardStatus',
      frequency: 1000
    },
    {
      resourceName: 'Property',
      fieldName: 'ListPrice',
      frequency: 999
    },
    {
      resourceName: 'Property',
      fieldName: 'CustomLookupField123',
      frequency: 500
    }
  ],
  lookups: [
    {
      resourceName: 'Office',
      fieldName: 'OfficeStateOrProvince',
      numLookupsTotal: 1000
    },
    {
      resourceName: 'Property',
      fieldName: 'AccessibilityFeatures',
      numLookupsTotal: 1000
    },
    {
      resourceName: 'Property',
      fieldName: 'StandardStatus',
      numLookupsTotal: 1000
    },
    {
      resourceName: 'Property',
      fieldName: 'CustomLookupField123',
      numLookupsTotal: 1000
    }
  ],
  lookupValues: [
    {
      resourceName: 'Office',
      fieldName: 'OfficeStateOrProvince',
      lookupValue: 'CA',
      frequency: 900
    },
    {
      resourceName: 'Office',
      fieldName: 'OfficeStateOrProvince',
      lookupValue: 'HI',
      frequency: 100
    },
    {
      resourceName: 'Property',
      fieldName: 'AccessibilityFeatures',
      lookupValue: 'Accessible Approach with Ramp',
      frequency: 100
    },
    {
      resourceName: 'Property',
      fieldName: 'AccessibilityFeatures',
      lookupValue: 'ReinforcedFloors',
      frequency: 100
    },
    {
      resourceName: 'Property',
      fieldName: 'StandardStatus',
      lookupValue: 'Active Under Contract',
      frequency: 900
    },
    {
      resourceName: 'Property',
      fieldName: 'StandardStatus',
      lookupValue: 'Pending',
      frequency: 100
    },
    {
      resourceName: 'Property',
      fieldName: 'CustomLookupField123',
      lookupValue: 'PENDING',
      frequency: 10
    },
    {
      resourceName: 'Property',
      fieldName: 'CustomLookupField123',
      lookupValue: 'NULL_VALUE',
      frequency: 9990
    }
  ]
};

module.exports = { daReport };
