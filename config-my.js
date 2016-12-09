var slackbot = require('./lib/bot');

var config = {

  showIssueDetails: true,
  issueDetailsToShow: {
    'fields.summary':1 ,
    'fields.assignee' : 1,
    'fields.creator' : 1,
    'fields.status': 1,
    'fields.priority': 1,
    'fields.type': 1
  },
  showDetailsByDefault: true,//if true, you don't need the '+' to get details
  bot_name: "Bonnie",//Provide the name to post under
  token: 'xoxb-95758839713-L3ndlZpblRmUHTTMOMMw6vfC', // https://api.slack.com/web
  jira_urls: {
    // DEFAULT NODE IS REQUIRED.
    "DEFAULT": {url: "https://appannie.atlassian.net/browse/"}, //https://appannie.atlassian.net/
    // These should match projects from the projects property where you want to use a configuration other than the default
    "AR": {
      url: "https://appannie.atlassian.net/browse/",
      jira: {
        user: 'xjiang-ext', // be sure to use the username, not the user email
        password: 'jiangxu-041419-04141991',
        host: 'appannie.atlassian.net',
        protocol: 'https',
        port: 443,
        version: '2',
        verbose: true,
        strictSSL: true
      }
    },
  },
  search_cmd: "search",
  //Since search results can be verbose, you may not want to muddy the channel
  search_output_chan: "TODO",//if the value is "this", then the current channel will be used, else the name of a channel
  projects: ["AR"],
  post: true,
  verbose: true,
  custom_texts: {
    messagePrefix: "" //message you might like to prefix to JiraBot's post
  },
  emoji: ":bonnie:", // be sure to upload your custom emoji in slack
  link_separator: ", ",// use \n if you want new lines
  error_channel: '' //the id of the channel to send low level log errors.  If not defined, will use the current channel
};

//DO NOT EDIT BELOW HERE
var slackbot = new slackbot.Bot(config);
slackbot.run();
