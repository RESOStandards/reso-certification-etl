const { getLookupMap, getStandardMetadata } = require('./common');
const lookupMap = getLookupMap();
const standardMetadata = getStandardMetadata();

const prefixFactory = prefix => string => prefix + string;
// This is because a resource name and a lookup value can be the same. For eg both can be 'Property'
const parentPrefix = prefixFactory('__parent__');

/**
 * Defines the bins template for stats.
 * @returns bins template with all bins initialized to 0.
 */
const getBinsTemplate = () => {
  return {
    eqZero: 0,
    gtZero: 0,
    gte25: 0,
    gte50: 0,
    gte75: 0,
    eq100: 0,
  };
};

/**
 * Defines the totals template for stats.
 * @returns totals template with all bins initialized to 0.
 */
const getTotalsTemplate = () => {
  return {
    total: getBinsTemplate(),
    reso: getBinsTemplate(),
    idx: getBinsTemplate(),
    local: getBinsTemplate(),
  };
};

/**
 * Defines the set of bins used for availability totals.
 * @returns totals template with all bins initialized to 0.
 */
const getAvailabilityTotalsTemplate = () => {
  return {
    total: getBinsTemplate(),
    reso: getBinsTemplate(),
    idx: getBinsTemplate(),
    local: getBinsTemplate(),
  };
};

/**
 * Defines the availability template for stats. This is the structure of the processed results.
 * @returns availability template with all totals and bins initialized to 0.
 */
const getAvailabilityTemplate = () => {
  return {
    fields: [],
    lookups: [],
    lookupValues: [],
    resources: [],
    availability: {
      fields: getAvailabilityTotalsTemplate(),
      lookups: getAvailabilityTotalsTemplate(),
      resources: {},
      resourcesBinary: {},
    },
  };
};

/**
 * Builds a standard field cache from a list of standard fields.
 * @param {Array} fields an array of standard fields.
 * @returns map of all standard fields addressable by cache[resourceName][fieldName]
 *          or an empty map if there are none.
 */
const createStandardFieldCache = (fields = []) =>
  fields.reduce((cache, item) => {
    const { resourceName, fieldName } = item;

    if (!(resourceName && fieldName)) return cache;

    if (!cache[resourceName]) {
      cache[resourceName] = {};
    }
    cache[resourceName][fieldName] = item;

    return cache;
  }, {});

/**
 * Builds a lookup value cache from a list of individual lookup value items.
 * @param {Array} lookupValues the lookup values to create the cache from.
 * @returns map of all lookups addressable by cache[resourceName][fieldName][lookupValue]
 *          or an empty map if there are none.
 */
const createLookupValueCache = (lookupValues = []) =>
  lookupValues.reduce((cache, item) => {
    const { resourceName, fieldName, lookupValue, parentResourceName = '' } = item;

    if (!(resourceName && fieldName && lookupValue)) return cache;

    if (!cache[resourceName]) {
      cache[resourceName] = {};
    }

    if (!cache[resourceName][fieldName]) {
      cache[resourceName][fieldName] = {};
    }

    if (parentResourceName) {
      if (!cache[resourceName][fieldName][parentPrefix(parentResourceName)]) {
        cache[resourceName][fieldName][parentPrefix(parentResourceName)] = {};
      }
      cache[resourceName][fieldName][parentPrefix(parentResourceName)][lookupValue] = item;
    } else {
      cache[resourceName][fieldName][lookupValue] = item;
    }

    return cache;
  }, {});

/**
 * Determines whether a given field is an IDX field.
 * TODO: The performance could be improved here in that there's a filter being done on each payloads array.
 *       There's potential speedup if each payload were turned into a nested property rather than an array.
 * @param {String} resourceName the name of the resource for the field.
 * @param {String} fieldName the name of the field.
 * @param {Object} standardFieldCache a field cache created by createStandardFieldCache().
 * @returns true if the given field is an IDX field, false otherwise.
 */
const isIdxField = (resourceName, fieldName, standardFieldCache = {}) =>
  resourceName &&
  fieldName &&
  isResoField(resourceName, fieldName, standardFieldCache) &&
  !!standardFieldCache[resourceName][fieldName]?.payloads?.filter(
    (x) => x === 'IDX'
  ).length > 0;

/**
 * Determines whether a given field is a RESO field.
 * @param {String} resourceName the name of the resource for the field.
 * @param {String} fieldName the name of the field.
 * @param {Object} standardFieldCache a field cache created by createStandardFieldCache().
 * @returns true if the given field is a RESO field, false otherwise.
 */
const isResoField = (resourceName, fieldName, standardFieldCache = {}) =>
  resourceName &&
  fieldName &&
  standardFieldCache[resourceName] &&
  !!standardFieldCache[resourceName][fieldName];

/**
 * Determines if a given lookup is a RESO lookup.
 * @param {String} resourceName the name of the resource for the field.
 * @param {String} fieldName the name of the field.
 * @param {String} lookupValue the name of the lookup to test.
 * @param {Object} standardFieldCache a field cache created by createStandardFieldCache().
 * @returns the RESO lookup, if found, otherwise null.
 */
const findResoLookup = (
  resourceName,
  fieldName,
  lookupValue,
  standardFieldCache = {}
) => {
  if (
    resourceName &&
    fieldName &&
    standardFieldCache[resourceName] &&
    standardFieldCache[resourceName][fieldName]
  ) {
    const field = standardFieldCache[resourceName][fieldName];

    if (
      field &&
      field.simpleDataType?.includes('String List') &&
      field.type?.includes('.')
    ) {
      const lookupName = field.type.substring(
        field.type.lastIndexOf('.') + 1,
        field.type.length
      );
      const lookup = lookupMap[lookupName]?.find(
        (x) =>
          x?.lookupValue === lookupValue || x?.lookupDisplayName === lookupValue
      );
      //TODO: turn the lookup map into its own inverted hash by lookup values and display names
      return lookup ? { lookupName, lookup } : null;
    }
  }
  return null;
};

/**
 * Computes availability from existing bins.
 * @param {Number} availability the current availability value.
 * @param {Object} bins existing bins containing past availability values.
 * @returns a new object following the getBinsTemplate structure that contains updated availabilities for each bin.
 */
const computeBins = (availability, bins) => {
  bins = bins || getBinsTemplate();
  return {
    eqZero: availability === 0 ? bins.eqZero + 1 : bins.eqZero,
    gtZero: availability > 0 ? bins.gtZero + 1 : bins.gtZero,
    gte25: availability >= 0.25 ? bins.gte25 + 1 : bins.gte25,
    gte50: availability >= 0.5 ? bins.gte50 + 1 : bins.gte50,
    gte75: availability >= 0.75 ? bins.gte75 + 1 : bins.gte75,
    eq100: availability === 1 ? bins.eq100 + 1 : bins.eq100,
  };
};

const getAvailabilityAggregatesByResourceTemplate = () => {
  return {
    fields: { total: 0.0, reso: 0.0, idx: 0.0, local: 0.0 },
    fieldCounts: { total: 0, reso: 0, idx: 0, local: 0 },
    lookups: { total: 0.0, reso: 0.0, idx: 0.0, local: 0.0 },
    lookupCounts: { total: 0, reso: 0, idx: 0, local: 0 },
  };
};

/**
 * Processes a RESO Data Availability Report and creates aggregates and roll-ups.
 * TODO: individual totals calculations could be tidied up a bit.
 * @param {Object} availabilityReport the RESO availability report JSON to process.
 * @returns a JSON availability report with the appropriate roll-ups and aggregates.
 */
const processDataAvailability = async (availabilityReport) => {
  //iterate over each field and lookup and compute their availabilities
  const { resources, fields, lookups, lookupValues, ...rest } = availabilityReport;

  const transformed = getAvailabilityTemplate();
  const standardFieldCache = createStandardFieldCache(standardMetadata.fields);

  const resourceCounts = {};
  resources.forEach(
    (resource) =>
      (resourceCounts[resource.resourceName] = resource.numRecordsFetched)
  );

  const lookupValuesWithParentResourceName = lookupValues.filter(l => l.parentResourceName);
  const lookupValuesWithoutParentResourceName = lookupValues.filter(l => !l.parentResourceName);
  const processedFields = [],
    processedLookupValues = [],
    lookupValueCacheWithoutParentResourceName = createLookupValueCache(
      lookupValuesWithoutParentResourceName
    ),
    lookupValueCacheWithParentResourceName = createLookupValueCache(
      lookupValuesWithParentResourceName
    );

  //binary resource availability cache
  const resourcesBinary = {};

  //resource availability cache
  const availabilityAggregatesByResource = {};

  //process fields
  fields.forEach((field) => {
    const { resourceName, fieldName, parentResourceName = '' } = field;

    const availability =
      field?.frequency && resourceCounts[resourceName]
        ? (1.0 * field.frequency) / resourceCounts[resourceName]
        : 0.0;

    //create template if not already present
    if (!availabilityAggregatesByResource[resourceName]) {
      availabilityAggregatesByResource[resourceName] =
        getAvailabilityAggregatesByResourceTemplate();
    }

    //update resource availability and counts
    availabilityAggregatesByResource[resourceName].fields.total += availability;
    availabilityAggregatesByResource[resourceName].fieldCounts.total++;

    //update aggregate availability
    transformed.availability.fields.total = computeBins(
      availability,
      transformed.availability.fields.total
    );

    //initialize discrete availability map if it does't exist
    if (!resourcesBinary[resourceName]) {
      resourcesBinary[resourceName] = {
        fields: getTotalsTemplate(),
        lookups: getTotalsTemplate(),
      };
    }

    //update discrete availability
    resourcesBinary[resourceName].fields.total = computeBins(
      availability,
      resourcesBinary[resourceName].fields.total
    );

    if (isResoField(resourceName, fieldName, standardFieldCache)) {
      //update resource availability and counts
      availabilityAggregatesByResource[resourceName].fields.reso +=
      availability;
      availabilityAggregatesByResource[resourceName].fieldCounts.reso++;

      //update aggregate availability
      transformed.availability.fields.reso = computeBins(
        availability,
        transformed.availability.fields.reso
      );

      //update discrete availability
      resourcesBinary[resourceName].fields.reso = computeBins(
        availability,
        resourcesBinary[resourceName].fields.reso
      );

      if (isIdxField(resourceName, fieldName, standardFieldCache)) {
        //update resource availability and counts
        availabilityAggregatesByResource[resourceName].fields.idx +=
        availability;
        availabilityAggregatesByResource[resourceName].fieldCounts.idx++;

        //update aggregate availability
        transformed.availability.fields.idx = computeBins(
          availability,
          transformed.availability.fields.idx
        );

        //update discrete availability
        resourcesBinary[resourceName].fields.idx = computeBins(
          availability,
          resourcesBinary[resourceName].fields.idx
        );
      }
    } else {
      //update resource availability and counts
      availabilityAggregatesByResource[resourceName].fields.local +=
      availability;
      availabilityAggregatesByResource[resourceName].fieldCounts.local++;

      //update aggregate availability
      transformed.availability.fields.local = computeBins(
        availability,
        transformed.availability.fields.local
      );

      //update discrete availability
      resourcesBinary[resourceName].fields.local = computeBins(
        availability,
        resourcesBinary[resourceName].fields.local
      );
    }

    //only process if there are lookups for this field

    const lookupsForField = (() => {
      if (parentResourceName) {
        return (
          lookupValueCacheWithParentResourceName[resourceName] &&
          lookupValueCacheWithParentResourceName[resourceName][fieldName] &&
          lookupValueCacheWithParentResourceName[resourceName][fieldName][
            parentPrefix(parentResourceName)
          ]
        );
      } else {
        return (
          lookupValueCacheWithoutParentResourceName[resourceName] &&
          lookupValueCacheWithoutParentResourceName[resourceName][fieldName]
        );
      }
    })();

    if (lookupsForField) {
      Object.values(lookupsForField).forEach((lookupValue) => {
        if (lookupValue && lookupValue?.lookupValue !== 'NULL_VALUE') {
          const lookupAvailability =
            lookupValue?.frequency && resourceCounts[resourceName]
              ? (1.0 * lookupValue.frequency) / resourceCounts[resourceName]
              : 0.0;

          //update resource availability and counts
          availabilityAggregatesByResource[resourceName].lookups.total +=
           lookupAvailability;
          availabilityAggregatesByResource[resourceName].lookupCounts.total++;

          //update aggregate availability
          transformed.availability.lookups.total = computeBins(
            lookupAvailability,
            transformed.availability.lookups.total
          );

          //update discrete availability
          resourcesBinary[resourceName].lookups.total = computeBins(
            lookupAvailability,
            resourcesBinary[resourceName].lookups.total
          );

          if (
            isResoField(
              lookupValue.resourceName,
              lookupValue.fieldName,
              standardFieldCache
            ) &&
            findResoLookup(
              lookupValue.resourceName,
              lookupValue.fieldName,
              lookupValue.lookupValue,
              standardFieldCache
            )
          ) {
            //update resource availability and counts
            availabilityAggregatesByResource[resourceName].lookups.reso +=
            lookupAvailability;
            availabilityAggregatesByResource[resourceName].lookupCounts.reso++;

            //update aggregate availability
            transformed.availability.lookups.reso = computeBins(
              lookupAvailability,
              transformed.availability.lookups.reso
            );

            //update discrete availability
            resourcesBinary[resourceName].lookups.reso = computeBins(
              lookupAvailability,
              resourcesBinary[resourceName].lookups.reso
            );

            if (
              isIdxField(
                lookupValue.resourceName,
                lookupValue.fieldName,
                standardFieldCache
              )
            ) {
              //update resource availability and counts
              availabilityAggregatesByResource[resourceName].lookups.idx +=
              lookupAvailability;
              availabilityAggregatesByResource[resourceName].lookupCounts.idx++;

              //update aggregate availability
              transformed.availability.lookups.idx = computeBins(
                lookupAvailability,
                transformed.availability.lookups.idx
              );

              //update discrete availability
              resourcesBinary[resourceName].lookups.idx = computeBins(
                lookupAvailability,
                resourcesBinary[resourceName].lookups.idx
              );
            }
          } else {
            //update availability and counts
            availabilityAggregatesByResource[resourceName].lookups.local +=
            lookupAvailability;
            availabilityAggregatesByResource[resourceName].lookupCounts.local++;

            //update update aggregate availability
            transformed.availability.lookups.local = computeBins(
              lookupAvailability,
              transformed.availability.lookups.local
            );

            //update discrete availability
            resourcesBinary[resourceName].lookups.local = computeBins(
              lookupAvailability,
              resourcesBinary[resourceName].lookups.local
            );
          }

          processedLookupValues.push({
            ...lookupValue,
            availability: lookupAvailability,
          });
        }
      });
    }

    //should always be OK, but just in case
    if (field) {
      processedFields.push({
        ...field,
        availability,
      });
    }
  });

  transformed.resources = resources;
  transformed.fields = processedFields;
  transformed.lookups = lookups;
  transformed.lookupValues = processedLookupValues;
  transformed.availability.resourcesBinary = resourcesBinary;
  transformed.availability.resources = computeResourceAvailability(
    availabilityAggregatesByResource
  );

  return { ...rest, ...transformed };
};

/**
 * Computes resource availability aggregates.
 * @param {*} availabilityAggregatesByResource overall resource availability from sum of field availability
 * @returns
 */
const computeResourceAvailability = (availabilityAggregatesByResource) => {
  return Object.entries(availabilityAggregatesByResource).reduce(
    (acc, [resourceName, { fields, lookups }]) => {
      if (!acc[resourceName])
        acc[resourceName] = {
          fields: { total: 0.0, reso: 0.0, idx: 0.0, local: 0.0 },
          lookups: { total: 0.0, reso: 0.0, idx: 0.0, local: 0.0 },
        };

      const {
        total: totalFields,
        reso: resoFields,
        idx: idxFields,
        local: localFields,
      } = fields;

      acc[resourceName].fields.total =
        (1.0 * totalFields) /
        (availabilityAggregatesByResource[resourceName]?.fieldCounts.total ||
          1);
      acc[resourceName].fields.reso =
        (1.0 * resoFields) /
        (availabilityAggregatesByResource[resourceName]?.fieldCounts.reso || 1);
      acc[resourceName].fields.idx =
        (1.0 * idxFields) /
      (availabilityAggregatesByResource[resourceName]?.fieldCounts.idx || 1);
      acc[resourceName].fields.local =
        (1.0 * localFields) /
        (availabilityAggregatesByResource[resourceName]?.fieldCounts.local ||
          1);

      const {
        total: totalLookups,
        reso: resoLookups,
        idx: idxLookups,
        local: localLookups,
      } = lookups;

      acc[resourceName].lookups.total =
        (1.0 * totalLookups) /
        (availabilityAggregatesByResource[resourceName]?.lookupCounts?.total ||
          1);
      acc[resourceName].lookups.reso =
        (1.0 * resoLookups) /
        (availabilityAggregatesByResource[resourceName]?.lookupCounts?.reso ||
          1);
      acc[resourceName].lookups.idx =
        (1.0 * idxLookups) /
        (availabilityAggregatesByResource[resourceName]?.lookupCounts?.idx ||
          1);
      acc[resourceName].lookups.local =
        (1.0 * localLookups) /
        (availabilityAggregatesByResource[resourceName]?.lookupCounts?.local ||
          1);

      return acc;
    },
    {}
  );
};

module.exports = {
  processDataAvailability,
  createStandardFieldCache,
  isIdxField,
  isResoField,
};
