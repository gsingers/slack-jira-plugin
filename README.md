# Slack JIRA Plugin

JIRA integration with [slack](http://slack.com).  

It does the following:

1. Automatically append a link to a message whenever there is a mention of a JIRA issue in the message

## Usage

TBD

This is an AWS Lambda function. Currently it is managed manually and needs to move to a serverless project

## Config

### Lambda

The Lambda setup where you enter code will have a set of fields for environment variables. Add `ISSUE_KEYS` as the variable name if it doesn't exist and the value is a pipe delimited list of keys like `MRG|STU|SS` etc. As new Jira projects emerge, add them, but it should be pretty static.

### Slack

There is a slack app called Jira Details that is private to our workspace. It contains various verification keys and is where we set up the events and access rights. We set up the slack app to trigger a post to the Lambda/API Gateway url specified whenever a message is sent. We setup permissions for all the channels there as well. Otherwise it's pretty set and forget.
