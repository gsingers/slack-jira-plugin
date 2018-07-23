var slackbot = require('./lib/bot');

var config = {

  showIssueDetails: true,
  issueDetailsToShow: {'fields.summary':1 , 'fields.assignee' : 1, 'fields.creator' : 0, 'fields.description': 0},
  showDetailsByDefault: true,//if true, you don't need the '+' to get details
  bot_name: "jira",//Provide the name to post under
  token: 'XXXX-XXXXXXXXXX-XXXXXXXXXX-XXXXXXXXXX-XXXXXX', // https://api.slack.com/web
  jira_urls: {
    // DEFAULT NODE IS REQUIRED.
    "DEFAULT": {url: "https://default.jira.server/browse/"},
    // These should match projects from the projects property where you want to use a configuration other than the default
    "SOLR": {
      url: "https://issues.apache.org/jira/browse/",
      jira: {
        user: 'username', // be sure to use the username, not the user email
        password: 'password',
        host: 'hostname',
        protocol: 'https',
        port: 443,
        version: '2',
        verbose: true,
        strictSSL: true
      }
    },
    "GRANT": {url:"http://grant.jira.server/jira/browse/"}
  },
  search_cmd: "search",
  //Since search results can be verbose, you may not want to muddy the channel
  search_output_chan: "C02U1L9KZ",//if the value is "this", then the current channel will be used, else the name of a channel
  projects: ["REPLACE", "ME", "WITH", "YOUR", "PROJECT", "NAMES", "GRANT", "SOLR"], // leave empty to include all projects
  post: true,
  verbose: true,
  custom_texts: {
    messagePrefix: "Hey, thought this might help: " //message you might like to prefix to JiraBot's post
  },
  emoji: ":jira:", // be sure to upload your custom emoji in slack
  link_separator: ", ",// use \n if you want new lines
  error_channel: '' //the id of the channel to send low level log errors.  If not defined, will use the current channel
};

//DO NOT EDIT BELOW HERE
var slackbot = new slackbot.Bot(config);
slackbot.run();
