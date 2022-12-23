const { standardMetadata } = require('./references/dd-1.7/standard-metadata');
const fs = require('fs/promises');

const standardResources = [
  'Property',
  'Member',
  'Office',
  'Contacts',
  'Media',
  'HistoryTransactional',
  'ContactListings',
  'InternetTracking',
  'SavedSearch',
  'OpenHouse',
  'Prospecting',
  'Queue',
  'Rules',
  'Teams',
  'Showing',
  'TeamMembers',
  'OUID',
  'ContactListingNotes',
  'OtherPhone',
  'PropertyGreenVerification',
  'PropertyPowerProduction',
  'PropertyRooms',
  'PropertyUnitTypes',
  'SocialMedia',
  'Field',
  'Lookup',
];

const getFieldDetails = async (fieldName, resourceName) => {
  return standardMetadata.fields.find(
    (field) =>
      field.fieldName === fieldName && field.resourceName === resourceName
  );
};

const getIdxLookups = (fields, lookups) => {
  const iDXDataTypes = [
    'String List, Multi',
    'String List,Multi',
    'String List, Single',
    'String List,Single',
  ];
  const iDXLookupFields = fields.filter((field) =>
    standardMetadata.fields.some(
      (x) =>
        x.resourceName === field.resourceName &&
        x.fieldName === field.fieldName &&
        x.payloads.includes('IDX') &&
        iDXDataTypes.includes(x.simpleDataType?.trim())
    )
  );
  const uniqueIDXLookupFields = [
    ...new Set(iDXLookupFields.map((field) => field.type)),
  ];
  const standardLookups = standardMetadata.lookups;
  return lookups.filter((lookup) => {
    return uniqueIDXLookupFields.some(
      (field) =>
        field === lookup.lookupName &&
        standardLookups.some(
          (sLookup) =>
            sLookup.lookupValue === lookup.lookupValue &&
            getLastPart(sLookup.lookupName, '.') ===
              getLastPart(lookup.lookupName, '.')
        )
    );
  });
};

const getLastPart = (str, char) => str.substr(str.lastIndexOf(char) + 1);

const getAdvertisedCountPerResourcesByType = ({ fields, lookups }) => {
  const reducedFields = fields.reduce(function (r, a) {
    r[a.resourceName] = r[a.resourceName] || [];
    r[a.resourceName].push(a);
    return r;
  }, Object.create(null));
  const advertisedCount = {};
  const idxLookups = getIdxLookups(fields, lookups);
  for (const [key, value] of Object.entries(reducedFields)) {
    advertisedCount[key] = { fields: {}, lookups: {} };
    advertisedCount[key]['fields'] = { total: 0, reso: 0, idx: 0, local: 0 };
    advertisedCount[key]['lookups'] = { total: 0, reso: 0, idx: 0, local: 0 };
    const lookupsCollection = [];
    for (const field of value) {
      advertisedCount[key]['fields'].total++;
      if (field.standardRESO) {
        advertisedCount[key]['fields'].reso++;
        if (field?.payloads?.includes('IDX')) {
          advertisedCount[key]['fields'].idx++;
        }
      } else {
        advertisedCount[key]['fields'].local++;
      }
      //collect lookup on single pass
      if (!field?.type.startsWith('Edm.')) {
        lookupsCollection.push(
          ...lookups.filter((lookup) => lookup.lookupName === field.type)
        );
      }
    }
    for (const lookup of lookupsCollection) {
      advertisedCount[key]['lookups'].total++;
      if (lookup.standardRESO) {
        advertisedCount[key]['lookups'].reso++;
        if (
          idxLookups.some(
            (idxLookup) =>
              idxLookup.lookupName === lookup.lookupName &&
              (idxLookup.lookupValue === lookup.lookupValue ||
                idxLookup?.annotations?.[0]?.value ===
                  lookup?.annotations?.[0]?.value)
          )
        ) {
          advertisedCount[key]['lookups'].idx++;
        }
      } else {
        advertisedCount[key]['lookups'].local++;
      }
    }
  }
  return advertisedCount;
};

const getIdxCounts = (fields, lookups) => {
  // TODO: should be idxFields
  const iDXFields = fields.filter((field) =>
    standardMetadata.fields.some(
      (x) =>
        x.resourceName === field.resourceName &&
        x.fieldName === field.fieldName &&
        x.payloads.includes('IDX')
    )
  );
  const iDXFieldsCount = iDXFields.length;

  // iDXResources
  const resources = [...new Set(fields.map((field) => field.resourceName))];
  const iDXResourcesCount = resources.filter((resource) =>
    standardMetadata.fields.some(
      (x) => x.resourceName === resource && x.payloads.includes('IDX')
    )
  ).length;

  /*  iDXLookups
  lookups of unique IDX fields with any of types ["String List, Single", String List, Multi] 
  */
  const iDXLookups = getIdxLookups(fields, lookups);
  const iDXLookupsCount = iDXLookups.length;
  return { iDXFieldsCount, iDXResourcesCount, iDXLookupsCount };
};

const getFieldsCount = (fields) => {
  const standardFieldsCount = fields.filter((field) =>
    standardMetadata.fields.some(
      (x) =>
        x.resourceName === field.resourceName && x.fieldName === field.fieldName
    )
  ).length;
  const localFieldsCount = fields.length - standardFieldsCount;
  return {
    standardFieldsCount,
    localFieldsCount,
    totalFieldsCount: fields.length,
  };
};

const getResourcesCount = (fields) => {
  const resources = [...new Set(fields.map((field) => field.resourceName))];
  const totalResourcesCount = resources.length;
  const standardResourcesCount = resources.filter((resource) =>
    standardResources.some((x) => x === resource)
  ).length;
  const localResourcesCount = totalResourcesCount - standardResourcesCount;
  return { standardResourcesCount, localResourcesCount, totalResourcesCount };
};

const getLookupsCount = (lookups) => {
  const standardLookupsCount = lookups.filter(
    (lookup) => lookup.standardRESO === true
  ).length;
  const localLookupsCount = lookups.length - standardLookupsCount;
  return {
    standardLookupsCount,
    localLookupsCount,
    totalLookupsCount: lookups.length,
  };
};

const writeFile = async (path, content = '') => {
  if (!path?.length) throw new Error('Path was empty in writeFile!');

  try {
    await fs.appendFile(path, Buffer.from(content));
  } catch (err) {
    console.log(err);
  }
};

const readFile = async (path = '') => {
  if (!path?.length) throw new Error('Path was empty in readFile!');

  try {
    return await fs.readFile(path, { encoding: 'utf8' });
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  getFieldDetails,
  getIdxCounts,
  getAdvertisedCountPerResourcesByType,
  getLookupsCount,
  getResourcesCount,
  getFieldsCount,
  writeFile,
  readFile,
};
