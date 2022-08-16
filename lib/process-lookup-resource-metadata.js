const EDM_STRING_TYPE = "Edm.String",
  LOOKUP_NAME_ANNOTATION_TERM = "RESO.OData.Metadata.LookupName",
  LOOKUP_STANDARD_NAME_ANNOTATION_TERM = "RESO.OData.Metadata.StandardName",
  LEGACY_ODATA_VALUE_TERM = "RESO.OData.Metadata.LegacyODataValue";

/** 
   * Transform Fields
   * 
   * Source Format:
   * 
   *  
   * 
   { ...,
    fields: [
      {
        "resourceName": "Property",
        "fieldName": "CoListAgentDesignation",
        "type": "Edm.String",
        "nullable": true,
        "isCollection": true,
        "unicode": true,
        "annotations": [
          {
            "term": "RESO.OData.Metadata.LookupName",
            "value": "CoListAgentDesignation"
          }
        ]
      },...
       "lookups": [{
          "LookupName": "StandardStatus",
          "LookupValue": "Active",
          "StandardLookupValue": null,
          "LegacyODataValue": "Active",
          "ModificationTimestamp": "2021-07-09T01:14:09Z",
          "LookupKey": "103-456188-2106739-8419115"
        },
        ...
      ]
    }
   * 
   * Target Format: 
   * 
   *
    fields: [
      {
        "resourceName": "Property",
        "fieldName": "CoListAgentDesignation",
        "type": "<value from annotations>",
        "nullable": true,
        "isCollection": true,
        "unicode": true,
        "annotations": [
          {
            "term": "RESO.OData.Metadata.LookupName",
            "value": "CoListAgentDesignation"
          }
        ]
      },..
        "lookups": [
        {
          "lookupName": "AreaSource",
          "lookupValue": "Appraiser",
          "type": "Edm.String",
          "annotations": [
            {
              "term": "RESO.OData.Metadata.StandardName",
              "value": "Appraiser"
            }
          ]
        },
        ...
      ]
    }
  ]
  */
const mergeLookupResourceMetadata = ({
  metadataReportJson: {
    fields: metadataReportFields = [],
    lookups: metadataReportLookups = [],
    ...metadataReport
  } = {},
  lookupResourceLookupsJson: { lookups: lookupResourceLookupsJson = [] } = {},
}) => {
  return {
    ...metadataReport,
    fields:
      metadataReportFields?.map(
        ({ annotations = [], type = null, ...fields }) => {
          return {
            ...fields,
            annotations,
            type:
              annotations.find(
                ({ term }) => term === LOOKUP_NAME_ANNOTATION_TERM
              )?.value || type,
          };
        }
      ) || [],
    lookups: [
      ...metadataReportLookups,
      ...(lookupResourceLookupsJson.map(
        ({
          LookupName: lookupName,
          LookupValue,
          StandardLookupValue,
          LegacyODataValue,
        }) => {
          const lookupMetadata = {
            lookupName,
            lookupValue: StandardLookupValue || LookupValue,
            type: EDM_STRING_TYPE,
            annotations: [
              {
                term: LOOKUP_NAME_ANNOTATION_TERM,
                value: LookupValue,
              },
              {
                term: LEGACY_ODATA_VALUE_TERM,
                value: LegacyODataValue,
              },
            ],
          };

          if (StandardLookupValue?.length) {
            lookupMetadata.annotations.push({
              term: LOOKUP_STANDARD_NAME_ANNOTATION_TERM,
              value: StandardLookupValue,
            });
          }

          return lookupMetadata;
        }
      ) || []),
    ],
  };
};

module.exports = {
  mergeLookupResourceMetadata,
};
