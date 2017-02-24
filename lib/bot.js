var _ = require('underscore');
var slack = require('./slacker');
var jira = require('jira');
var slackbot = require('node-slackbot');
var JiraApi = require('jira').JiraApi;
var request = require('request');
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


function generateMsg(configUrl, issue, prefix) {
  return prefix + '<' + configUrl + issue.key + '|' + issue.key + '>';
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
          fullMsg += generateMsg(configUrl, item, self.config.custom_texts.messagePrefix);
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
          value.jira.verbose,
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
  pattern += ")-[1-9][0-9]*)(\\+)?(?:(?=\\W)|$)";
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
        var regexp = new RegExp(pattern, "gi"),
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
              prjName = match[2].toUpperCase(),
          // if the PROJECT-XXX is followed by a +, then we include
          // issue details in the response message:
              expandInfo = !!match[3];
          // pass-in a defered and the jira issue number,
          // then execute immediately...
          // we need this closure to capture the _current_ values...
          // (this is async...)
          if (self.config.showDetailsByDefault) {
            expandInfo = true;
          }
          var jiraApi = apis[prjName];
          if (jiraApi == null) {
            //explicit urls that don't have jira credentials will be marked by NONE.  If we don't have a
            // key at all, then we are using the DEFAULT, so see if it has credentials
            jiraApi = apis["DEFAULT"];
          }
          verbose=true
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
                  var msg = [];
                  console.log(issue);
                  console.log(self.config.post);
                  if (issue && self.config.post == true) {
                    var configUrl = getBaseUrl(prjName, self.config);
                    // msg.push(generateMsg(configUrl, issue, self.config.custom_texts.messagePrefix));
                    if (self.config.showIssueDetails && expandInfo) {
                      // msg.push('>>> \n*Summary*\n' + (issue.fields.summary || issue.key));
                      var prefix = ':jira: <' + configUrl + issue.key + '| *' + issue.key + ' : ' + (issue.fields.summary || issue.key) + '* >';
                      msg.push(prefix);
                      if (verbose) {
                        console.log(issue);
                      }
                      var assignee,creator,developer,status,priority,type;
                    // if (self.config.issueDetailsToShow['fields.assignee'] && issue.fields.assignee) {
                    //     msg.push('\n*Assignee*\n:minor:' + issue.fields.assignee.displayName);
                    //   }
                    //   if (self.config.issueDetailsToShow['fields.creator'] && issue.fields.creator) {
                    //     msg.push('\n*Creator*\n:major:' + issue.fields.creator.displayName);
                    //   }
                    //   if (self.config.issueDetailsToShow['fields.developer'] && issue.fields.customfield_11041) {
                    //     msg.push('\n*Developer*\n' + issue.fields.customfield_11041.displayName);
                    //   }
                    //   if (self.config.issueDetailsToShow['fields.status'] && issue.fields.status) {
                    //     msg.push('\n*Status*\n' + issue.fields.status.name);
                    //   }
                    //   if (self.config.issueDetailsToShow['fields.priority'] && issue.fields.priority) {
                    //     msg.push('\n*Priority*\n' + issue.fields.priority.name);
                    //   }
                    //   if (self.config.issueDetailsToShow['fields.type'] && issue.fields.issuetype) {
                    //     msg.push('\n*Type*\n' + issue.fields.issuetype.name);
                    //   }
                      if (self.config.issueDetailsToShow['fields.assignee'] && issue.fields.assignee) {
                        assignee = '*Assignee :* _' + issue.fields.assignee.displayName + '_\t';
                      }
                      if (self.config.issueDetailsToShow['fields.creator'] && issue.fields.creator) {
                        creator = '*Creator :* _' + issue.fields.creator.displayName + '_\t';
                      }
                      if (self.config.issueDetailsToShow['fields.status'] && issue.fields.status) {
                        status = '*Status :* _' + issue.fields.status.name +'_\t';
                      }
                      if (self.config.issueDetailsToShow['fields.priority'] && issue.fields.priority) {
                        priority = '*Priority :* _' + issue.fields.priority.name +'_\t';
                      }
                      if (self.config.issueDetailsToShow['fields.type'] && issue.fields.issuetype) {
                        type = '*Type :* _' + issue.fields.issuetype.name +'_\t';
                      }

                      msg.push('>>>' + type + status + priority + assignee + creator);
                    }
                  } else {
                    msg.push(':exclamation:' + jira + ' - _' + error + '_');
                  }
                  msg = msg.join('\n');
                  if (verbose) {
                    console.log(msg);
                  }
                  var req = {"channel": message.channel, "text": msg, "type": "issue"};
                  def.resolve(req);
                });
              })(q.defer(), j);
            } else {
              (function (def, jira) {
                requests.push(def.promise);
                var configUrl = getBaseUrl(prjName, self.config);
                var msg = generateMsg(configUrl, {key: jira}, self.config.custom_texts.messagePrefix);
                //Since JIRA instances like Apache aren't at standard URLs, the Node JIRA module can't interact with them properly due to
                // a bug in the way they handle paths.  This method attempts to hit the generated URL directly using request and parse out what the title and status are
                console.log("Attempting to retrieve public link: " + configUrl + jira);
                request(configUrl + jira, function (error, response, body) {
                  if (!error && response.statusCode == 200) {
                    //console.log(body); // Show the HTML for the Google homepage.
                    //Get the <title> tag, which seems to be pretty consistent
                    var startTitle = body.indexOf("<title>");
                    var endTitle = body.indexOf("</title>");
                    if (startTitle != -1 && endTitle != -1){
                      var title = body.substring(startTitle + 7/*length of <title>*/, endTitle);
                      console.log("Title: " + title);
                      //if the Key can't be found, we don't necessarily get an error, see https://issues.apache.org/jira/browse/MAHOUT-111111 as an example
                      if (title.indexOf(jira) != -1){
                        msg += "- " + title;
                      } else {
                        msg += "- No Title available.  May not be able to find the JIRA."
                      }
                    }

                  } else {
                    console.log("Unable to retrieve: " + jira + " Msg: " + msg);
                  }
                  var req = {"channel": message.channel, "text": msg};
                  def.resolve(req);
                })

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
            self.slacker.send('chat.postMessage', message, {
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
              if (theRequest.channel == "this") {
                chan = message.channel;
              } else {
                chan = theRequest.channel;
              }
            }
            self.slacker.send('chat.postMessage', message, {
              channel: chan,
              parse: "all",
              text: theRequest.text,
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
