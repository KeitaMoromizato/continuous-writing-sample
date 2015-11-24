'use strict';

// textlint and rules
import {TextLintCore} from 'textlint';
import YahooKousei from 'textlint-rule-ja-yahoo-kousei';
import AppearenceCountOfWords from 'textlint-rule-max-appearence-count-of-words';
import MaxLengthOfTitle from 'textlint-rule-max-length-of-title';
import NGWord from 'textlint-rule-ng-word';

// rule config
import AppearenceCountOfWordsConfig from '../ruleConfig/appearenceCountOfWords.json'
import MaxLengthOfTitleConfig from '../ruleConfig/maxLengthOfTitle.json';
import NGWordConfig from '../ruleConfig/ngWord.json';

import {find, assing} from 'lodash';
import * as GitHubApi from 'github';

const textlint = new TextLintCore();
textlint.setupRules({
  'ja-yahoo-kousei': YahooKousei,
  'max-appearence-count-of-words': AppearenceCountOfWords,
  'max-length-of-title': MaxLengthOfTitle,
  'ng-word': NGWord
}, {
  'max-appearence-count-of-words': AppearenceCountOfWordsConfig,
  'max-length-of-title': MaxLengthOfTitleConfig,
  'ng-word': NGWordConfig,
});

const github = new GitHubApi({
  version: "3.0.0",
  debug: true,
  protocol: "https",
});
github.authenticate({
  type: "oauth",
  token: process.env.GITHUB_API_KEY
});

// ignore NOT PullRequest
if (!process.env.CI_PULL_REQUEST) process.exit();

// initialize
const match = process.env.CI_PULL_REQUEST.match(/\d+$/);
const PR_NUMBER = match[0];

const ghSetting = {
  user: process.env.GITHUB_USERNAME,
  repo: process.env.CIRCLE_PROJECT_REPONAME,
  number: PR_NUMBER,
};

// run
function getChangedText() {
  return new Promise((resolve, reject) => {
    this.github.pullRequests.getFiles(ghSetting, (error, data) => {
      if (error) return reject(error);

      const file = find(data, f => f.filename.indexOf('.md') !== -1 );

      console.log("success getFiles() : ", file);

      if (!file) return reject(new Error('file not found'));

      this.github.repos.getContent(extend({}, ghSetting, {
        ref: process.env.CIRCLE_SHA1,
        path: file.filename
      }), (error, data) => {
          if (error) return reject(error);

          const buffer = new Buffer(data.content, data.encoding);
          const content = buffer.toString();

          console.log("success getContent() : ", content);
          resolve(content);
        });
    });
  });
}

function postComment(text) {
  return new Promise((resolve, reject) => {
    this.github.issues.createComment(extend({}, ghSetting, { body: text }), (error, data) => {
      if (error) console.log(error);
      // DO NOTHING
    });
  });
}

getChangedText.then(text => {

  return textlint.lintMarkdown(text);

}).then(result => {

  return postComment(reduce(result.mesasges, (sum, m) => `${sum}${m.message}\n`));

}).then(__ => {
  // ok
}).catch(error => {
  console.error(error);
});