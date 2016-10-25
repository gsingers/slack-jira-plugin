var slackbot = require('./lib/bot');

var config = {

  showIssueDetails: true,
  issueDetailsToShow: {'fields.summary':1 , 'fields.assignee' : 0, 'fields.creator' : 0, 'fields.description': 0},
  showDetailsByDefault: true,//if true, you don't need the '+' to get details
  minimalDisplay: true, // if true, don't add any titles or bolds or quote levels. Add summary inline after link.
  bot_name: "jira details",//Provide the name to post under
  token: 'xoxp-2238808984-2251966250-39880295232-ade771d65e', // https://api.slack.com/web
  jira_urls: {
    // DEFAULT NODE IS REQUIRED.
    "DEFAULT": {
        url: "https://taskeasy.jira.com/browse/",
              jira: {
            user: 'slackbot',
            password: 'hangovercure',
            host: 'taskeasy.jira.com',
            protocol: 'https',
            port: 443,
            version: '2',
            verbose: true,
            strictSSL: true
        }
    }
    // These should match projects from the projects property where you want to use a configuration other than the default
//    "SOLR": {
//      url: "https://issues.apache.org/jira/browse/",
//      jira: {
//        user: 'username', // be sure to use the username, not the user email
//       password: 'password',
//        host: 'hostname',
//        protocol: 'https',
//        port: 443,
//        version: '2',
//        verbose: true,
//        strictSSL: true
//      }
//    },
//    "GRANT": {url:"http://grant.jira.server/jira/browse/"}
  },
  search_cmd: "search",
  //Since search results can be verbose, you may not want to muddy the channel
  search_output_chan: "this",//if the value is "this", then the current channel will be used, else the name of a channel
  projects: ["CC", "DES", "STU", "THD", "MRG", "MPM", "OPS", "PM", "SKP", "SS", "GTEP"],
  post: true,
  verbose: false,
  custom_texts: {
    messagePrefix: "" //message you might like to prefix to JiraBot's post
  },
  emoji: ":jira:", // be sure to upload your custom emoji in slack
  detailSeparator: " ", // default is \n. You can use anything else to customize (inline is the most common case)
  link_separator: ", ",// use \n if you want new lines
  error_channel: '' //the id of the channel to send low level log errors.  If not defined, will use the current channel
};

//DO NOT EDIT BELOW HERE
var slackbot = new slackbot.Bot(config);
slackbot.run();