var _ = require('underscore');
var slack = require('./slacker');
var jira = require('jira');
var slackbot = require('node-slackbot');
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
    silent: false,
    nick: 'slckbt',
    username: 'slckbt'
  });

  this.slacker = new slack.Slacker({ token: this.config.token });
  return this;
};

Bot.prototype.run = function () {
  var self = this;
  var bot = new slackbot(this.config.token);
  bot.use(function (message, cb) {

    if ('message' == message.type && message.text != null) {
      var jiraIssue = message.text.match(self.config.pattern);
      var text = message.text;
      var changed = jiraIssue != null && jiraIssue.length > 0;
      var links = "";
      _.each(jiraIssue, function (jira) {
        var prjName = jira.substring(0, jira.indexOf("-"));//NOTE this assumes all JIRA issues are like: PROJECT_NAME-1234
        var url;
        var configUrl = "";
        if (self.config.jira_urls[prjName]) {
          configUrl = self.config.jira_urls[prjName];
        } else {
          configUrl = self.config.jira_urls["DEFAULT"];
        }
        url = configUrl + jira;
        links += " " + url;
      });
      text += "\n\t>>> JIRA: " + links;
      if (changed) {
        //console.log(message.user + ' said: ' + message.text + " and replaced: " + text);
        self.slacker.send('chat.update', {
          channel: message.channel,
          parse: "full",
          text: text,
          ts: message.ts
        });
      }
    }
    cb();
  });
  bot.connect();
};


exports = module.exports.Bot = Bot;
