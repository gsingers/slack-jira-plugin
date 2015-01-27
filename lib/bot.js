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
var Bot = function(config) {
  var self = this;
  this.config = _.defaults(config, {
    bot_name: "JIRABot",
    emoji: ":jira:",
    post: true
  });

  console.log( q.all );

  this.japi = new JiraApi(
    config.jira.protocol,
    config.jira.host,
    config.jira.port,
    config.jira.user,
    config.jira.password,
    config.jira.version,
    config.jira.strictSSL,
    config.jira.oauth
  );
  this.slacker = new slack.Slacker({
    token: this.config.token
  });
  return this;
};

Bot.prototype.run = function() {
  var self = this,
      verbose = self.config.verbose,
      bot = new slackbot(this.config.token),
      pattern = "(?:\\W|^)((";
  _.each(self.config.projects, function(prj, index, list) {
    pattern += prj;
    if (index != list.length - 1) {
      pattern += "|";
    }
  });
  pattern += ")-\\d+)(?:(?=\\W)|$)";
  if (verbose) {
    console.log("Pattern is: " + pattern);
  }
  bot.use(function(message, cb) {
    if ('message' == message.type && message.text != null && message.subtype != "bot_message") {
      if (verbose) {
        console.log(message);
      }
      var regexp = new RegExp(pattern, "g"),
          match,
          requests = [],
          def;
      while (match = regexp.exec(message.text)) {
            // PROJECT-XXXX is the first capturing group, e.g. ((PROJECT)-\d+)
        var j = match[1].trim(),
            // PROJECT is the second capturing group
            prjName = match[2];
        // pass-in a defered and the jira issue number,
        // then execute immediately...
        // we need this closure to capture the _current_ values...
        // (this is async...)
        (function(def, jira) {
          requests.push(def.promise);
          self.japi.findIssue(jira, function(error, issue) {
            var msg;
            if (issue && self.config.post == true) {
              var configUrl,
                  responseMessage;
              if (self.config.jira_urls[prjName]) {
                configUrl = self.config.jira_urls[prjName];
              } else {
                configUrl = self.config.jira_urls["DEFAULT"];
              }
              console.log(issue);
              msg = ':jira: <' + configUrl + issue.key + '|*' + issue.key + '*> - "' + (issue.fields.summary || issue.key) + '"';
              msg += ' | assignee: _' + issue.fields.assignee.displayName + '_';
              if( issue.fields.customfield_11041 ){
                msg += ' | developer: _' + issue.fields.customfield_11041.displayName + '_';
              }
            } else {
              msg = ':exclamation:*' + jira + '* - _' + error + '_';
            }
            def.resolve(msg);
          });
        })(q.defer(), j);
      }
      if( requests.length > 0 ){
        q.all(requests).then(function(messages){
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

    }
    cb();
  });
  bot.connect();
};

exports = module.exports.Bot = Bot;
