var _ = require('underscore');
var slack = require('./slacker');
var jira = require('jira');
var slackbot = require('node-slackbot');
var JiraApi = require('jira').JiraApi;
var q = require('q');

/**
 * Slackbot to integrate JIRA.
 *
 * The main thing it does right now is auto-expand links, but since we are bringing in the JIRA plugin, there is more it can do
 *
 * See config-example.js for configuration
 *
 * To run:  node config-XXX.js   (where XXX is the name of your config
 *
 * See:
 * https://www.npmjs.com/package/node-slackbot
 * https://www.npmjs.com/package/jira
 */
var Bot = function (config) {
  var self = this;
  this.config = _.defaults(config, {
    bot_name: "JIRABot",
    emoji: ":jira:",
    post: true
  });
  this.slacker = new slack.Slacker({
    token: this.config.token
  });
  return this;
};

function getBaseUrl(prjName, config) {
  var configUrl;
  if (config.jira_urls[prjName]) {
    configUrl = config.jira_urls[prjName].url;
  } else {
    configUrl = config.jira_urls["DEFAULT"].url;
  }
  return configUrl;
}


function generateMsg(configUrl, issue) {
  return ':jira: <' + configUrl + issue.key + '|*' + issue.key + '*>';
}

function generateAttachement(configUrl, issue){
  var attachment = {};

  attachment.fallback = issue.key + ' - ' + issue.fields.summary;
  attachment.title = issue.key + ' - ' + issue.fields.summary;
  attachment.title_link = configUrl + issue.key;
  attachment.fields = [
    {
      "title": "Priority",
      "value": issue.fields.priority.name,
      "short": true
    },
    {
      "title": "Assignee",
      "value": issue.fields.assignee.displayName,
      "short": true
    },
    {
      "title": "Status",
      "value": issue.fields.status.name,
      "short": true
    },
  ];
  if(issue.fields.duedate){
    attachment.fields.push({
        "title": "Due",
        "value": issue.fields.duedate,
        "short": true
      });
  }

  switch(issue.fields.status.name){
    case "Closed":
      attachment.color = "good";
      break;
    default:
      attachment.color = "danger";
  }
  attachment.text = " ";
  attachment.text = issue.fields.description;
  
  return attachment;
}

function doSearch(splits, self, apis, requests) {
  var prjName = splits.shift();
  var configUrl = getBaseUrl(prjName, self.config);
  var jiraApi = apis[prjName];
  if (jiraApi == null) {
    //explicit urls that don't have jira credentials will be marked by NONE.  If we don't have a
    // key at all, then we are using the DEFAULT, so see if it has credentials
    jiraApi = apis["DEFAULT"];
  }//https://jira.lucidworks.com/browse/WEB-1059?jql=text%20~%20%22grant%22
  var chan = self.config.search_output_chan;
  var def = q.defer();
  requests.push(def.promise);
  var searchString = "text ~ \"" + splits.join(" ") + "\"";
  console.log("Search for: " + searchString + " Output to: " + chan);
  var optional = {"maxResults": 10};
  try {
    jiraApi.searchJira(searchString, optional, function (error, body) {
      //console.log(body);
      if (body && body.total > 0) {
        var fullMsg = "Total hits: " + body.total + " for " + searchString + "\n";
        _.each(body.issues, function (item) {
          console.log(item.key);
          fullMsg += generateMsg(configUrl, item);
          fullMsg += ' - "' + (item.fields.summary || item.key) + '"';
          fullMsg += "\n";
        });
        /*if (self.config.verbose) {
          console.log(fullMsg);
        }*/

        var req = {"channel": chan, "text": fullMsg, "type": "search"};
        def.resolve(req)
      } else {
        console.log(error);
        var req = {"channel": null, "text": "There was an error executing your search: " + error, "type": "error"};
        def.resolve(req);
      }
    });
  } catch (e) {
    var req = {"channel": null, "text": "There was an error executing your search: " + e, "type": "error"};
    def.resolve(req);
  }

}

Bot.prototype.run = function () {
  var self = this,
      verbose = self.config.verbose,
      bot = new slackbot(this.config.token),
      pattern = "(?:\\W|^)((";
  var apis = {};
  _.each(self.config.jira_urls, function (value, key, obj) {

    if (value.jira) {
      console.log("Creating API for:");
      console.log(key);
      console.log(value);
      apis[key] = new JiraApi(
          value.jira.protocol,
          value.jira.host,
          value.jira.port,
          value.jira.user,
          value.jira.password,
          value.jira.version,
          value.jira.strictSSL,
          value.jira.oauth
      );
    } else {
      apis[key] = "NONE";//put in a placeholder in the map for explicitly declared JIRA urls that don't have JIRA credentials so that we can know when to use the default
    }
  });
  var prjNames = "";
  _.each(self.config.projects, function (prj, index, list) {
    pattern += prj;
    prjNames += prj;
    if (index != list.length - 1) {
      pattern += "|";
      prjNames += "|";
    }
  });
  pattern += ")-\\d+)(\\+)?(?:(?=\\W)|$)";
  if (verbose) {
    console.log("Pattern is: " + pattern);
  }
  bot.use(function (message, cb) {
    if ('message' == message.type && message.text != null && message.subtype != "bot_message") {
      var requests = [];
      if (message.text.indexOf("@" + self.config.bot_name) == 0) {
        // @JIRABot search [URL KEY] [channel name] 'text to search'
        var text = message.text;
        var splits = text.split(/\s+/)
        //discard the mention of the bot and search
        splits.shift();
        var command = splits.shift();
        if (command == self.config.search_cmd) {
          doSearch(splits, self, apis, requests);
        }
      }
      else {
        var regexp = new RegExp(pattern, "g"),
            match, def;
        while (match = regexp.exec(message.text)) {
          if (verbose) {
            console.log("Match:");
            console.log(message);
            console.log(match);
          }
          // PROJECT-XXXX is the first capturing group, e.g. ((PROJECT)-\d+)
          var j = match[1].trim(),
          // PROJECT is the second capturing group
              prjName = match[2],
          // if the PROJECT-XXX is followed by a +, then we include
          // issue details in the response message:
              expandInfo = !!match[3];
          // pass-in a defered and the jira issue number,
          // then execute immediately...
          // we need this closure to capture the _current_ values...
          // (this is async...)
          if (self.config.showDetailsByDefault){
            expandInfo = true;
          }
          var jiraApi = apis[prjName];
          if (jiraApi == null) {
            //explicit urls that don't have jira credentials will be marked by NONE.  If we don't have a
            // key at all, then we are using the DEFAULT, so see if it has credentials
            jiraApi = apis["DEFAULT"];
          }
          if (verbose) {
            console.log(jiraApi);
          }
          try {
            if (jiraApi && jiraApi != "NONE") {
              (function (def, jira) {
                requests.push(def.promise);
                jiraApi.findIssue(jira, function (error, issue) {
                  if (verbose) {
                    console.log("JIRA: " + jira);
                  }
                  var msg;
                  var attachments = [];

                  if (issue && self.config.post == true) {
                    var configUrl = getBaseUrl(prjName, self.config);
                    msg = generateMsg(configUrl, issue);

                    if (self.config.showIssueDetails && expandInfo) {
                      attachments.push(generateAttachement(configUrl, issue));
                      var req = {"channel": message.channel, "attachments": attachments, "text": " "};
                    }else{
                      var req = {"channel": message.channel, "text": msg};
                    }
                    
                  } else {
                    msg = ':exclamation:' + jira + ' - _' + error + '_';
                  }
                  if (verbose) {
                    console.log(msg);
                  }

                  def.resolve(req);
                });
              })(q.defer(), j);
            } else {
              (function (def, jira) {
                requests.push(def.promise);
                var configUrl = getBaseUrl(prjName, self.config);
                var msg = generateMsg(configUrl, {key: jira});
                var req = {"channel": message.channel, "text": msg};
                def.resolve(req);
              })(q.defer(), j);
            }
          } catch (e) {
            var channel;
            if (self.config.error_channel) {
              channel = self.config.error_channel;
            } else {
              channel = message.channel;
            }
            var theMsg = "There was an error in handling the request for: " + message.text + " Error: " + e;
            self.slacker.send('chat.postMessage', {
              channel: channel,
              parse: "all",
              text: theMsg,
              username: self.config.bot_name,
              unfurl_links: false,
              link_names: 1,
              icon_emoji: self.config.emoji
            });
          }
        }
      }
      if (requests.length > 0) {
        q.all(requests).then(function (messages) {
          _.forEach(messages, function (theRequest) {
            if (verbose) {
              console.log("Message:");
              console.log(theRequest);
            }
            var chan = null;
            if (!theRequest.channel) {
              chan = message.channel;
            } else {
              if (theRequest.channel == "this"){
                chan = message.channel;
              } else {
                chan = theRequest.channel;
              }
            }
            self.slacker.send('chat.postMessage', {
              channel: chan,
              parse: "all",
              text: theRequest.text,
              attachments: JSON.stringify(theRequest.attachments),
              username: self.config.bot_name,
              unfurl_links: false,
              link_names: 1,
              icon_emoji: self.config.emoji
            });
          });
        })
      }
      cb();
    }
  });
  bot.connect(self.config.verbose);
};

exports = module.exports.Bot = Bot;
