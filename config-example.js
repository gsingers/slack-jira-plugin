var slackbot = require('./lib/bot');

var config = {

  showIssueDetails: true,
  showDetailsByDefault: true,//if true, you don't need the '+' to get details
  bot_name: "",//Provide the name to post under
  token: 'XXXX-XXXXXXXXXX-XXXXXXXXXX-XXXXXXXXXX-XXXXXX',
  jira_urls: {
    "SOLR": {
      url: "https://issues.apache.org/jira/browse/"
    },
    "GRANT": {url:"http://grant.jira.server/jira/browse/"},
    "DEFAULT": {url: "https://default.jira.server/browse/"}
  },
  search_cmd: "search",
  //Since search results can be verbose, you may not want to muddy the channel
  search_output_chan: "C02U1L9KZ",//if the value is "this", then the current channel will be used, else the name of a channel
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
