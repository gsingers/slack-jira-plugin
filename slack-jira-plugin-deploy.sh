#!/usr/bin/env bash

filename="$1-$2.tar.gz"

function abort
{
    echo "$1" 1>&2
    exit 1
}

echo "untarring file"
mkdir slack-jira-plugin
pushd slack-jira-plugin
tar xfz ../$filename || abort "couldn't untar files"
popd

echo "removing old deploy dir"
rm -rf /var/taskeasy/slack-jira-plugin || abort "couldn't remove old /var/taskeasy/slack-jira-plugin"
echo "moving new code into /var/taskeasy/slack-jira-plugin"
mv slack-jira-plugin /var/taskeasy || abort "unable to mv slack-jira-plugin to /var/taskeasy"
rm $filename

pushd /var/taskeasy/slack-jira-plugin
su -c "pm2 delete slack-jira-plugin" pm2
su -c "pm2 start slack-jira-plugin.js --hp /home/pm2" pm2
su -c "pm2 save --hp /home/pm2" pm2
popd