var slackbot = require('./lib/bot');

var config = {

    token: 'XXXX-XXXXXXXXXX-XXXXXXXXXX-XXXXXXXXXX-XXXXXX',
    jira_urls: {
      "APACHE": "https://issues.apache.org/jira/browse/",
      "REPLACE": "https://my.path.to.jira/browse/"
    },
    pattern: /((GRANT))-\d+/g,
};

//DO NOT EDIT BELOW HERE
var slackbot = new slackbot.Bot(config);
slackbot.run();
