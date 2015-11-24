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

import {find, assign, reduce} from 'lodash';
import github from 'github';

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

const githubAPI = new github({
  version: "3.0.0",
  debug: true,
  protocol: "https",
});
githubAPI.authenticate({
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
    githubAPI.pullRequests.getFiles(ghSetting, (error, data) => {
      if (error) return reject(error);

      const file = find(data, f => f.filename.indexOf('.md') !== -1 );

      if (!file) return reject(new Error('file not found'));

      githubAPI.repos.getContent(assign({}, ghSetting, {
        ref: process.env.CIRCLE_SHA1,
        path: file.filename
      }), (error, data) => {
          if (error) return reject(error);

          const buffer = new Buffer(data.content, data.encoding);
          resolve(buffer.toString());
        });
    });
  });
}

function postComment(text) {
  return new Promise((resolve, reject) => {
    githubAPI.issues.createComment(assign({}, ghSetting, { body: text }), (error, data) => {
      if (error) console.log(error);
      // DO NOTHING
    });
  });
}

getChangedText().then(text => {

  return textlint.lintMarkdown(text);

}).then(result => {

  return postComment(reduce(result.messages, (sum, m) => `${sum}* ${m.message}\n`, ''));

}).then(__ => {
  // ok
}).catch(error => {
  console.error(error);
});
