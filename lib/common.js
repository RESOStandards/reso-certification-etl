const CURRENT_DD_VERSION = '1.7';
const STANDARD_NAME_ANNOTATION_TERM = 'RESO.OData.Metadata.StandardName';
const DD_WIKI_URL_TERM = 'RESO.DDWikiUrl';

const { standardMetadata } = require("./reference-metadata/dd-1.7/standard-metadata");
const { standardResources } = require("./constants/standard-resources");

const getFieldDetails = async (fieldName, resourceName) => {
  return standardMetadata.fields.find((field) => field.fieldName === fieldName && field.resourceName === resourceName);
};

const getIdxLookups = (fields, lookups) => {
  const iDXDataTypes = ["String List, Multi", "String List,Multi", "String List, Single", "String List,Single"];
  const iDXLookupFields = fields.filter((field) =>
    standardMetadata.fields.some(
      (x) =>
        x.resourceName === field.resourceName &&
        x.fieldName === field.fieldName &&
        x.payloads.includes("IDX") &&
        iDXDataTypes.includes(x.simpleDataType?.trim())
    )
  );
  const uniqueIDXLookupFields = [...new Set(iDXLookupFields.map((field) => field.type))];
  const standardLookups = standardMetadata.lookups;
  return lookups.filter((lookup) => {
    return uniqueIDXLookupFields.some(
      (field) =>
        field === lookup.lookupName &&
        standardLookups.some(
          (sLookup) =>
            sLookup.lookupValue === lookup.lookupValue &&
            getLastPart(sLookup.lookupName, ".") === getLastPart(lookup.lookupName, ".")
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
  let advertisedCount = {};
  const idxLookups = getIdxLookups(fields, lookups);
  for (const [key, value] of Object.entries(reducedFields)) {
    advertisedCount[key] = { fields: {}, lookups: {} };
    advertisedCount[key]["fields"] = { total: 0, reso: 0, idx: 0, local: 0 };
    advertisedCount[key]["lookups"] = { total: 0, reso: 0, idx: 0, local: 0 };
    let lookupsCollection = [];
    for (const field of value) {
      advertisedCount[key]["fields"].total++;
      if (field.standardRESO) {
        advertisedCount[key]["fields"].reso++;
        if (field?.payloads?.includes("IDX")) {
          advertisedCount[key]["fields"].idx++;
        }
      } else {
        advertisedCount[key]["fields"].local++;
      }
      //collect lookup on single pass
      if (!field?.type.startsWith("Edm.")) {
        lookupsCollection.push(...lookups.filter((lookup) => lookup.lookupName === field.type));
      }
    }
    for (const lookup of lookupsCollection) {
      advertisedCount[key]["lookups"].total++;
      if (lookup.standardRESO) {
        advertisedCount[key]["lookups"].reso++;
        if (
          idxLookups.some(
            (idxLookup) =>
              idxLookup.lookupName === lookup.lookupName &&
              (idxLookup.lookupValue === lookup.lookupValue ||
                idxLookup?.annotations?.[0]?.value === lookup?.annotations?.[0]?.value)
          )
        ) {
          advertisedCount[key]["lookups"].idx++;
        }
      } else {
        advertisedCount[key]["lookups"].local++;
      }
    }
  }
  return advertisedCount;
};

const getIdxCounts = (fields, lookups) => {
  // TODO: should be idxFields
  const iDXFields = fields.filter((field) =>
    standardMetadata.fields.some(
      (x) => x.resourceName === field.resourceName && x.fieldName === field.fieldName && x.payloads.includes("IDX")
    )
  );
  const iDXFieldsCount = iDXFields.length;

  // iDXResources
  const resources = [...new Set(fields.map((field) => field.resourceName))];
  const iDXResourcesCount = resources.filter((resource) =>
    standardMetadata.fields.some((x) => x.resourceName === resource && x.payloads.includes("IDX"))
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
    standardMetadata.fields.some((x) => x.resourceName === field.resourceName && x.fieldName === field.fieldName)
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
  const standardResourcesCount = resources.filter((resource) => standardResources.some((x) => x === resource)).length;
  const localResourcesCount = totalResourcesCount - standardResourcesCount;
  return { standardResourcesCount, localResourcesCount, totalResourcesCount };
};

const getLookupsCount = (lookups) => {
  const standardLookupsCount = lookups.filter((lookup) => lookup.standardRESO === true).length;
  const localLookupsCount = lookups.length - standardLookupsCount;
  return {
    standardLookupsCount,
    localLookupsCount,
    totalLookupsCount: lookups.length,
  };
};

/**
 * Gets metadata for a given version
 * This the metadata references come from:
 *
 *  https://raw.githubusercontent.com/RESOStandards/web-api-commander/main/src/main/resources/RESODataDictionary-1.7.metadata-report.json
 *
 * And is autogenerated with each version
 *
 * @param {String} version the version of the metadata to fetch, for example "1.7" (current default)
 * @returns the latest copy of the metadata file at the URL in the description
 */
const getMetadata = async (version = CURRENT_DD_VERSION) => require(`./reference-metadata/dd-${version}.json`) || {};

const buildAnnotationMap = (annotations = []) =>
  annotations.reduce((acc, { term, value }) => {
    acc[term] = value;
    return acc;
  }, {});

/*
Converts the reference metadata from this: 

  "lookups": [
    {
      "lookupName": "org.reso.metadata.enums.AreaSource",
      "lookupValue": "Appraiser",
      "type": "Edm.Int32",
      "annotations": [
        {
          "term": "RESO.OData.Metadata.StandardName",
          "value": "Appraiser"
        },
        {
          "term": "RESO.DDWikiUrl",
          "value": "https://ddwiki.reso.org/display/DDW17/Appraiser"
        },
        {
          "term": "Core.Description",
          "value": "An appraiser provided the measurement of the area."
        }
      ]
    },
    
  to this:
  
  const lookupMap = {
  AccessibilityFeatures: [
    {
      lookupValue: "AccessibleApproachWithRamp",
      lookupDisplayName: "Accessible Approach with Ramp",
      wikiPageURL:
        "https://ddwiki.reso.org/display/DDW17/Accessible+Approach+with+Ramp",
    },
*/
const getReferenceLookupMap = async (version = CURRENT_DD_VERSION) =>
  (await getMetadata(version)).lookups.reduce((acc, { lookupName, lookupValue, annotations }) => {
    const parsedLookupName = lookupName?.substring(lookupName?.lastIndexOf(".") + 1);
    const annotationMap = buildAnnotationMap(annotations);

    if (parsedLookupName && !acc[parsedLookupName]) acc[parsedLookupName] = [];
    acc[parsedLookupName].push({
      lookupValue,
      lookupDisplayName: annotationMap[STANDARD_NAME_ANNOTATION_TERM],
      wikiPageURL: annotationMap[DD_WIKI_URL_TERM],
    });
    return acc;
  }, {});


/**
 * Produces a transformed version of the reference metadata that's used for the Certification API
 * 
 * The metadata references come from:
 *
 *  https://raw.githubusercontent.com/RESOStandards/web-api-commander/main/src/main/resources/RESODataDictionary-1.7.metadata-report.json
 *
 * And is autogenerated with each version, with a local copy stored in ./reference-metadata/<version>/metadata-report.json
 *
 * @param {String} version the version of the metadata to fetch, for example "1.7" (current default)
 * @returns the latest copy of the metadata file at the URL in the description
 */
const getReferenceStandardMetadata = async (version = CURRENT_DD_VERSION) => {
  //TODO

  /* 
    Step 1: Reduce the fields array into the format needed for standard metadata

    Source Format: 

      "fields": [
        {
          "resourceName": "Property",
          "fieldName": "AboveGradeFinishedArea",
          "type": "Edm.Decimal",
          "nullable": true,
          "scale": 2,
          "precision": 14,
          "isCollection": false,
          "unicode": true,
          "annotations": [
            {
              "term": "RESO.OData.Metadata.StandardName",
              "value": "Above Grade Finished Area"
            },
            {
              "term": "RESO.DDWikiUrl",
              "value": "https://ddwiki.reso.org/display/DDW17/AboveGradeFinishedArea+Field"
            },
            {
              "term": "Core.Description",
              "value": "Finished area within the structure that is at or above the surface of the ground."
            }
          ]
        },...

    Target Format: 

      "fields": [
        {
          resourceName: "Property",
          fieldName: "AboveGradeFinishedArea",
          type: "Edm.Decimal",
          payloads: [],
          wikiPageURL:
            "https://ddwiki.reso.org/display/DDW17/AboveGradeFinishedArea+Field",
          simpleDataType: "Number",
        }, ...
  */


  /*
     Step 2: Reduce the lookups array from metadata-report.json into the format needed for standard-metadata

     Source Format: 

      "lookups": [
        {
          "lookupName": "org.reso.metadata.enums.AreaSource",
          "lookupValue": "Appraiser",
          "type": "Edm.Int32",
          "annotations": [
            {
              "term": "RESO.OData.Metadata.StandardName",
              "value": "Appraiser"
            },
            {
              "term": "RESO.DDWikiUrl",
              "value": "https://ddwiki.reso.org/display/DDW17/Appraiser"
            },
            {
              "term": "Core.Description",
              "value": "An appraiser provided the measurement of the area."
            }
          ]
        },...


      Target Format: 

        "lookups": [
          {
            lookupName: "org.reso.metadata.enums.AreaSource",
            lookupValue: "Appraiser",
            type: "Edm.Int32",
            wikiPageURL: "https://ddwiki.reso.org/display/DDW17/Appraiser",
          },...
  */


};

module.exports = {
  getFieldDetails,
  getIdxCounts,
  getAdvertisedCountPerResourcesByType,
  getLookupsCount,
  getResourcesCount,
  getFieldsCount,
  getReferenceStandardMetadata,
  getReferenceLookupMap,
};
