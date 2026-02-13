const appInsights = require("applicationinsights");

const cs = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

if (cs) {
  appInsights
    .setup(cs)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true, true)
    .setUseDiskRetryCaching(true)
    .start();
}
