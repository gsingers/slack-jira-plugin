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
    bot_name: "",//Provide the name to post under
    token: 'XXXX-XXXXXXXXXX-XXXXXXXXXX-XXXXXXXXXX-XXXXXX', //get from https://api.slack.com/web#basics
    showIssueDetails: true, //true if you want to expand w/ titles
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
    projects: ["REPLACE", "ME", "WITH", "YOUR", "PROJECT", "NAMES"],  // Replace these w/ a comma separated list of your project URLs., as in SOLR, LUCENE, etc.
    verbose: true,
    emoji: ":jira:",
    link_separator: ", "// use \n if you want new lines
};

//DO NOT EDIT BELOW HERE
var slackbot = new slackbot.Bot(config);
slackbot.run();
```

Save this to a file in the root of the project then run your bot with:

    node your-config-file, eg.: node config-gsingers

This will launch the bot in your terminal based on provided configuration.

## Configuration

- `token`: Your Slack API token, get your token at https://api.slack.com/
- `jira_urls`: A mapping of JIRA project names to the URL that can display that JIRA issue, i.e. SOLR -> https://issues.apache.org/jira/browse/
- `projects`: A list of JIRA project names, as in SOLR, MAHOUT, LUCENE
- `post`: If true, then post a new msg, else update the current one
- `verbose`: print logging info
- `emoji`: The emoji to use for the bot.  You may need to create a JIRA emoji for the current one to work, else replace w/ your favorite slack emoji
- `link_separator`: The text to use to separate links in the response.

## TODO:

- Deeper integration w/ the JIRA API
- Optionally restrict to certain config'd channels
