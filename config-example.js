var slackbot = require('./lib/bot');

var config = {

  showIssueDetails: true,
  bot_name: "",//Provide the name to post under
  token: 'XXXX-XXXXXXXXXX-XXXXXXXXXX-XXXXXXXXXX-XXXXXX',
  jira_urls: {
    "SOLR": {
      url: "https://issues.apache.org/jira/browse/",
      jira: {//OPTIONAL: provide access to jira credentials for a particular repository
        user: 'foo.bar',
        password: 's3kR3t',
        host: 'jira.foobar.com',
        protocol: 'https',
        port: 443,
        version: '2',
        strictSSL: true
      }
    },
    "GRANT": {url:"http://grant.jira.server/jira/browse/"},
    "DEFAULT": {url: "https://default.jira.server/browse/"}
  },
  search_cmd: "search",
  search_output_chan: "C02U1L9KZ",
  projects: ["REPLACE", "ME", "WITH", "YOUR", "PROJECT", "NAMES"],
  post: true,
  verbose: true,
  emoji: ":jira:",
  link_separator: ", ",// use \n if you want new lines
  error_channel: '' //the id of the channel to send low level log errors.  If not defined, will use the current channel
};

//DO NOT EDIT BELOW HERE
var slackbot = new slackbot.Bot(config);
slackbot.run();
