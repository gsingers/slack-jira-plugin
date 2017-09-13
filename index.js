const https = require('https'),
      AWS = require('aws-sdk'),
      request = require('request'),
      qs = require('querystring'),
      VERIFICATION_TOKEN = "WMzZaLmqEvyGrJicaxCArOm2",
      ACCESS_TOKEN = "xoxp-2238808984-2251966250-240226688692-9593459247bca3eb8623d1255da9e024";

// Verify Url - https://api.slack.com/events/url_verification
function verify(body, callback) {
    if (body.token === VERIFICATION_TOKEN) {
        callback(null, body.challenge);
    } else {
        callback("verification failed");   
    }
}

// Post message to Slack - https://api.slack.com/methods/chat.postMessage
function process_event(event, callback) {
    // test the message for a match and not a bot
    var regex = new RegExp(`(${process.env.ISSUE_KEYS})-[\\d]+`, 'ig');
    var issueMatch = event.text.match(regex);
    if (!event.bot_id && issueMatch) {
        // Do Jira Search
        issueMatch.forEach(function(value){
            request('https://taskeasy.jira.com/rest/api/2/issue/' + value, {
                'auth': {
                    'user': 'slackbot',
                    'pass': 'hangovercure'
                }},
                function(error, response, body) {
                    if (!error && response.statusCode === 200) {
                        var result = JSON.parse(body);
                        console.log("Body is: ", result.fields.summary);
                        sendSlackMessage(event, result.fields.summary, value, callback);
                    } else {
                        console.log("Error sending: " + value, error);
                        callback(error);
                    }
            });
        })
    } else {
        callback(null);   
    }
}

function sendSlackMessage(event, text, key, callback) {
    var res = `<https://taskeasy.jira.com/browse/${key}|${key}> ${text}`;
        
    var message = { 
        token: ACCESS_TOKEN,
        channel: event.channel,
        text: res,
        parse: "all",
        unfurl_links: false,
        link_names: 1
    };

    var query = qs.stringify(message); // prepare the querystring
    https.get(`https://slack.com/api/chat.postMessage?${query}`);
    
    callback(null)
}

// Lambda handler
exports.handler = (data, context, callback) => {
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? (err.message || err) : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    
    var body = JSON.parse(data.body);
    switch (body.type) {
        case "url_verification": verify(body, done); break;
        case "event_callback": process_event(body.event, done); break;
        default: done(null, 'no valid event type from slack');
    }
};