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
    bot_name: "JIRABot",
    emoji: ":jira:",
    link_separator: ", ",
    post: true
  });

  this.slacker = new slack.Slacker({ token: this.config.token });
  return this;
};

Bot.prototype.run = function () {
  var self = this;
  var verbose = self.config.verbose;
  var bot = new slackbot(this.config.token);
  bot.use(function (message, cb) {
    if ('message' == message.type && message.text != null && message.subtype != "bot_message") {
      if (verbose){
        console.log(message);
      }
      var text = message.text;
      var links = "";
      var regexp = new RegExp(self.config.pattern);
      var match = regexp.exec(message.text);
      var changed = match != null;
      while (match != null) {
        var jira = match[1].trim(); // PROJECT-XXXX is the first capturing group, e.g. ((PROJECT)-\d+)
        var prjName = match[2];     // PROJECT is the second capturing group
        var url;
        var configUrl = "";
        if (self.config.jira_urls[prjName]) {
          configUrl = self.config.jira_urls[prjName];
        } else {
          configUrl = self.config.jira_urls["DEFAULT"];
        }
        url = configUrl + jira;
        if (links.length > 0) {
          links += self.config.link_separator;
        }
        links += url;
        match = regexp.exec(message.text);
      }
      if (changed) {
        text += "\n\t>>> JIRA: " + links;
        if (verbose) {//TODO: replace w/ better logging
          console.log(message.user + ' said: ' + message.text + " and replaced: " + text);
        }

        if (self.config.post == true) {
          self.slacker.send('chat.postMessage', {
            channel: message.channel,
            parse: "full",
            text: "\t" + links,
            username: self.config.bot_name,
            unfurl_links: false,
            link_names: 1,
            icon_emoji: self.config.emoji
          });
        } else {
          self.slacker.send('chat.update', {
            channel: message.channel,
            parse: "full",
            text: text,
            ts: message.ts
          });
        }
      }
    }
    cb();
  });
  bot.connect();
};


exports = module.exports.Bot = Bot;
