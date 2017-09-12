var request = require('request');

/**
 * Slack API wrapper
 * @param {object} config Slacker configuration
 * - token: Slack API token
 */
var Slacker = function (config) {
  this.token = config.token;
  return this;
};

/**
 * Send slack API request
 * @param  {string} method Slack API method
 * @param  {object} paramString the GET params
 */
Slacker.prototype.get = function (method, paramString) {
  if (!paramString){
    paramString = "?";
  }
  paramString += "&token=" + this.token;
  console.log("get: " + paramString);
  return request.get({
    url: 'https://slack.com/api/' + method + paramString,
    json: true
  });
};

Slacker.prototype.send = function (method, message, args) {
  args = args || {};
  args.token = this.token;

  // Was the original message sent in a separate thread?  If so, add 
  // the thread ts to the outgoing message to 'tie it' to the 
  // on-going thread.
  if (message.thread_ts != null && message.thread_ts != "")
  {
      args.thread_ts = message.thread_ts;
  }
  
  request.post({
    url: 'https://slack.com/api/' + method,
    json: true,
    form: args
  }, function (error, response, body) {
    if (error || !body.ok) {
      console.log('Error Sending:', error || body.error);
    }
  });
};

exports.Slacker = Slacker;