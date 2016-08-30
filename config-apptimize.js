var slackbot = require('./lib/bot');

var config = {

  showIssueDetails: false,
  //showIssueDetails: true,
  //issueDetailsToShow: {'fields.summary':1 , 'fields.assignee' : 1, 'fields.creator' : 0, 'fields.description': 0},
  issueDetailsToShow: {'fields.summary':0 , 'fields.assignee' : 0, 'fields.creator' : 0, 'fields.description': 0},
  showDetailsByDefault: false,//if true, you don't need the '+' to get details
  //showDetailsByDefault: true,//if true, you don't need the '+' to get details
  bot_name: "jira",//Provide the name to post under
  token: 'xoxb-74560654869-2OnlkDfnHnQAbj8zLppvVP6A',
  jira_urls: {
    // DEFAULT NODE IS REQUIRED.
    "DEFAULT": {url: "https://apptimize.atlassian.net/browse/"},
  },
  search_cmd: "no_searching_allowed",
  // search_cmd: "search",
  //Since search results can be verbose, you may not want to muddy the channel
  search_output_chan: "this",//if the value is "this", then the current channel will be used, else the name of a channel
  projects: ["DASH", "SYS", "PROJ", "BUG"],
  post: true,
  verbose: true,
  custom_texts: {
    messagePrefix: "JIRA: " //message you might like to prefix to JiraBot's post
  },
  emoji: ":jira:", // be sure to upload your custom emoji in slack
  link_separator: "\n",// use \n if you want new lines
  error_channel: '' //the id of the channel to send low level log errors.  If not defined, will use the current channel
};

//DO NOT EDIT BELOW HERE
var slackbot = new slackbot.Bot(config);
slackbot.run();
