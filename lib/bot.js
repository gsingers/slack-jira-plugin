var _ = require('underscore');
var slack = require('./slacker');
var jira = require('jira');
var slackbot = require('node-slackbot');
var JiraApi = require('jira').JiraApi;
var q = require('q');
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var app = express();


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
  return '<' + configUrl + issue.key + '|*' + issue.key + '*>';
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
  _.each(self.config.projects, function (prj, index, list) {
    pattern += prj;
    if (index != list.length - 1) {
      pattern += "|";
    }
  });
  pattern += ")-\\d+)(\\+)?(?:(?=\\W)|$)";
  if (verbose) {
    console.log("Pattern is: " + pattern);
  }
  bot.use(function (message, cb) {
    if ('message' == message.type && message.text != null && message.subtype != "bot_message") {

      var regexp = new RegExp(pattern, "g"),
          match,
          requests = [],
          def;
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
        var jiraApi = apis[prjName];
        if (jiraApi == null) {
          //explicit urls that don't have jira credentials will be marked by NONE.  If we don't have a
          // key at all, then we are using the DEFAULT, so see if it has credentials
          jiraApi = apis["DEFAULT"];
        }
        if (verbose) {
          console.log(jiraApi);
        }
        if (jiraApi && jiraApi != "NONE") {
          (function (def, jira) {
            requests.push(def.promise);
            jiraApi.findIssue(jira, function (error, issue) {
              if (verbose) {
                console.log("JIRA: " + jira);
              }
              var msg;
              if (issue && self.config.post == true) {
                var configUrl = getBaseUrl(prjName, self.config);
                msg = generateMsg(configUrl, issue);
                if (self.config.showIssueDetails && expandInfo) {
                  msg += ' - "' + (issue.fields.summary || issue.key) + '"';
                  if (verbose) {
                    console.log(issue);
                  }
                  if (issue.fields.assignee) {
                    msg += ' | assignee: _' + issue.fields.assignee.displayName + '_';
                  } else if (issue.fields.creator) {
                    msg += ' | creator: _' + issue.fields.creator.displayName + '_';
                  }
                  if (issue.fields.customfield_11041) {
                    msg += ' | developer: _' + issue.fields.customfield_11041.displayName + '_';
                  }
                }
              } else {
                msg = ':exclamation:' + jira + ' - _' + error + '_';
              }
              if (verbose) {
                console.log(msg);
              }
              def.resolve(msg);
            });
          })(q.defer(), j);
        } else {
          (function (def, jira) {
            requests.push(def.promise);
            var configUrl = getBaseUrl(prjName, self.config);
            var msg = generateMsg(configUrl, {key: jira});
            def.resolve(msg);
          })(q.defer(), j);
        }
      }
      if (requests.length > 0) {
        q.all(requests).then(function (messages) {
          if (verbose) {
            console.log("Messages:");
            console.log(messages);
          }
          self.slacker.send('chat.postMessage', {
            channel: message.channel,
            parse: "all",
            text: messages.join(' '),
            username: self.config.bot_name,
            unfurl_links: false,
            link_names: 1,
            icon_emoji: self.config.emoji
          });
        })
      }
      cb();
    }
  });
  bot.connect(self.config.verbose);
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: false}));
  app.post('/', function (req, res) {
    var token = req.body.token;
    var slashCommand = req.body.command;
    if (token == self.config.command_token && slashCommand == self.config.command && req.body.text) {
      console.log(req.body);
      var text = req.body.text;
      var splits = text.split(/\s+/);
      console.log(splits);
      var cmd = splits.shift();
      if (cmd) {//we have a command, how to handle it
        //TODO: better way of handling this through call backs or registrations and a scripting library or something, but let's get something working first
        if (cmd == "help") {
          var msg = "";
          msg += self.config.command + " urls // Returns the list of JIRA projects accessible from this bot as name:URL pairs\n";
          msg += self.config.command + " search [URL KEY] 'text to search' // Searches the URL using JIRA JQL for the text, this is the equivalent of jql=text ~ \"text to search\"\n";
          msg += self.config.command + " addComment [URL KEY] ISSUE comment // Adds a comment to the JIRA issue in the project using the user/pass specified.  Note, the user/pass must have permission\n";
          res.send("Help:" + "\n" + msg);
        } else if (cmd == "urls") {
          var msg = "";
          _.each(self.config.jira_urls, function(value, key){
            msg += "Key: " + key + " Value: " + value.url + "\n";
          });
          res.send(msg);
        } else if (cmd == "addComment") {
          //addComment URL_NAME ISSUEID "comment"
          var prjName = splits.shift();
          var jiraApi = apis[prjName];
          if (jiraApi == null) {
            //explicit urls that don't have jira credentials will be marked by NONE.  If we don't have a
            // key at all, then we are using the DEFAULT, so see if it has credentials
            jiraApi = apis["DEFAULT"];
          }
          var issueId = splits.shift();
          var comment = splits.join(" ");
          console.log("Adding to " + issueId + " with comment: " + comment);
          jiraApi.addComment(issueId, comment, function(error, body){
            if (body){///jira addComment DEFAULT JIRATEST-66 this is a comment
              console.log(body);
            } else if (error){
              console.log(error);
              res.send("Unable to comment on issue " + issueId);
            }
          });
        } else if (cmd == "search") {
          var prjName = splits.shift();
          var configUrl = getBaseUrl(prjName, self.config);
          var jiraApi = apis[prjName];
          if (jiraApi == null) {
            //explicit urls that don't have jira credentials will be marked by NONE.  If we don't have a
            // key at all, then we are using the DEFAULT, so see if it has credentials
            jiraApi = apis["DEFAULT"];
          }//https://jira.lucidworks.com/browse/WEB-1059?jql=text%20~%20%22grant%22
          var searchString = "text ~ \"" + splits.join(" ") + "\"";
          console.log("Search for: " + searchString);
          var optional = {};
          jiraApi.searchJira(searchString, optional, function(error, body){
            //console.log(body);
            if (body && body.total > 0) {
              var fullMsg = "Total hits: " + body.total + "\n";
              _.each(body.issues, function (item) {
                console.log(item.key);
                fullMsg += generateMsg(configUrl, item);
                fullMsg += ' - "' + (item.fields.summary || item.key) + '"';
                fullMsg += "\n";
              });
              console.log(fullMsg);
              res.send(fullMsg);
            } else {
              console.log(error);
              res.send("There was an error executing your search: " + error);
            }
          });
        }
      }
      //res.send('Hello World!')

    }
  });

  var server = app.listen(11234, function () {

    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s with token: %s', host, port, self.config.command_token);

  });

};


exports = module.exports.Bot = Bot;
