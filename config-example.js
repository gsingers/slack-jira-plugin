var slackbot = require('./lib/bot');

var config = {
    jira: {
      user: 'foo.bar',
      password: 's3kR3t',
      host: 'jira.foobar.com',
      protocol: 'https',
      port: 443,
      version: '2',
      strictSSL: true
    },
    showIssueDetails: true,
    bot_name: "",//Provide the name to post under
    token: 'XXXX-XXXXXXXXXX-XXXXXXXXXX-XXXXXXXXXX-XXXXXX',
    jira_urls: {
      "SOLR": "https://issues.apache.org/jira/browse/",
      "GRANT": "http://grant.jira.server/jira/browse/",
      "DEFAULT": "https://default.jira.server/browse/"
    },
    projects: ["REPLACE", "ME", "WITH", "YOUR", "PROJECT", "NAMES"],
    verbose: true,
    emoji: ":jira:",
    link_separator: ", "// use \n if you want new lines
};

//DO NOT EDIT BELOW HERE
var slackbot = new slackbot.Bot(config);
slackbot.run();
