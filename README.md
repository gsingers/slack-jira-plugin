# Slack JIRA Plugin

JIRA integration with [slack](http://slack.com).  

It does the following:

1. Automatically append a link to a message whenever there is a mention of a JIRA issue in the message

## Usage

```javascript
git clone https://github.com/gsingers/slack-jira-plugin.git
cd slack-jira-plugin
npm install
```

Write your own configuration file (`config-example.js`) is a good starting point for building your own.

```javascript
var slackbot = require('./lib/bot');

var config = {
  showIssueDetails: true,
  basicIssueDetailsToShow: {'fields.summary': 1, 'fields.assignee' : 1, 'fields.creator' : 0, 'fields.description': 0},
  fullIssueDetailsToShow: {'fields.summary':1 , 'fields.assignee' : 1, 'fields.creator': 1, 'fields.description': 1},
  issueSeparator: "\n",
  maxFieldLength: 100,
  issueLabelSeparator: ": ",
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
  projects: ["REPLACE", "ME", "WITH", "YOUR", "PROJECT", "NAMES", "GRANT", "SOLR"],
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
```

Save this to a file in the root of the project then run your bot with:

    node your-config-file, eg.: node config-gsingers

This will launch the bot in your terminal based on provided configuration.

## Configuration

- `token`: Your Slack API token, get your token at https://api.slack.com/web
- `issueDetailsToShow`: Details from JIRA you want to be rendered in Slack
- `jira_urls`: A mapping of JIRA project names to the URL that can display that JIRA issue, i.e. SOLR -> https://issues.apache.org/jira/browse/
- `projects`: A list of JIRA project names, as in SOLR, MAHOUT, LUCENE
- `post`: If true, then post a new msg, else update the current one
- `verbose`: print logging info
- `custom_texts.messagePrefix`: An optional message that you can prefix at the beginning of the bot's message that will be posted
- `emoji`: The emoji to use for the bot.  You may need to create a JIRA emoji for the current one to work, else replace w/ your favorite slack emoji
- `link_separator`: The text to use to separate links in the response.

## TODO

- Deeper integration w/ the JIRA API
- Optionally restrict to certain config'd channels
- bot.js expandInfo conflicts with "+" providing feature or that feature is not done yet
- Possible Issue: Whenever code compiled and server restarted, it runs parsing for the last posted message again, even though it might have been processed already in the previous run.
