const { readFile } = require("./common");

const stepsMap = {
  "IDX Payload": {
    name: "IDX Payload",
    steps: ["Data Dictionary 1.7", "Data Availability 1.7", "IDX Payload 1.7"],
  },
  "Data Dictionary": {
    name: "Data Dictionary",
    steps: ["Data Dictionary 1.7", "Data Availability 1.7"],
  },
  "Web API Core": {
    name: "Web API Core",
    steps: ["Web API Core 2.0.0"],
  },
};
// TODO: what are the "rest" of the params in this method?? One is error.log, another is the failed step name. What is the order?
const processCucumberJson = async (pathToCucumberFile = "", ...rest) => {
  const cucumberReport = JSON.parse(await readFile(pathToCucumberFile)) || [];

  const failedSteps = cucumberReport
    ?.flatMap(({ elements }) =>
      elements.flatMap((element) =>
        element.steps.map((step) =>
          step.result.status === "failed" ? step : null
        )
      )
    )
    .filter((step) => step);

  /**
   * sample error_message from errors[0].result.error_message
   *
   * "java.lang.AssertionError: The following fields are missing the required 'RESO.OData.Metadata.LookupName' annotation: \nCountyOrParish, StreetDirSuffix, City, StateOrProvince, StreetDirPrefix, StreetSuffix\n\n\tat org.junit.Assert.fail(Assert.java:89)\n\tat org.reso.certification.stepdefs.LookupResource.resoLookupsUsingStringOrStringCollectionDataTypesMUSTHaveTheAnnotation(LookupResource.java:173)\n\tat ✽.RESO Lookups using String or String Collection data types MUST have the annotation \"RESO.OData.Metadata.LookupName\"(file:///home/jdarnell/work/reso/github/web-api-commander/src/main/java/org/reso/certification/features/data-dictionary/v1-7-0/additional-tests/lookup-resource-tests.feature:42)\n"
   */

  /**
   * we need to parse it into the following
   *
   * "The following fields are missing the required 'RESO.OData.Metadata.LookupName' annotation: \nCountyOrParish, StreetDirSuffix, City, StateOrProvince, StreetDirPrefix, StreetSuffix"
   */

  const errors = failedSteps.map(
    ({ result: { error_message, status } = {}, name = "" }) => {
      const assertionMessageTrimmed = error_message?.substr(
        error_message?.indexOf(":") + 1,
        error_message?.length
      );
      const message = assertionMessageTrimmed
        ?.substr(0, assertionMessageTrimmed.indexOf("\n\n"))
        ?.trim();

      return {
        stepName: name,
        message,
      };
    }
  );
};

const parseErrorLog = (log = "") => {
  /**
   * sample error log
   * 
   * [2022-10-06 21:13:40.566] [ERROR] [LookupResource] - ERROR: The following fields are missing the required 'RESO.OData.Metadata.LookupName' annotation: 
   CountyOrParish, StreetDirSuffix, City, StateOrProvince, StreetDirPrefix, StreetSuffix

   should be trnasformed into 
  
  "errorLog": [
    {
      "testStep": "LookupResource",
      "message": "The following fields are missing the required 'RESO.OData.Metadata.LookupName' annotation: 
      CountyOrParish, StreetDirSuffix, City, StateOrProvince, StreetDirPrefix, StreetSuffix" 
    }
  ]
   */
  const trimmedTimestampAndError = log?.substring(
    log.lastIndexOf("["),
    log?.length
  );
  const testStep = trimmedTimestampAndError.substring?.(
    1,
    trimmedTimestampAndError.indexOf("]")
  );
  const errorString = trimmedTimestampAndError
    ?.replace(`[${testStep}]`, "")
    .trim();

  /**
   matches string starting with "-" or "- ERROR:" 
   */
  const errorPrefixRegex = /^- (ERROR:)?/;
  const message = errorString?.replace(errorPrefixRegex, "")?.trim();
  console.log({
    testStep,
    message,
  });
};

module.exports = {
  processCucumberJson,
};
