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
                  } else if (issue.fields.creator){
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
};

exports = module.exports.Bot = Bot;
