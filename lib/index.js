'use strict';

// textlint and rules

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _textlint = require('textlint');

var _textlintRuleJaYahooKousei = require('textlint-rule-ja-yahoo-kousei');

var _textlintRuleJaYahooKousei2 = _interopRequireDefault(_textlintRuleJaYahooKousei);

var _textlintRuleMaxAppearenceCountOfWords = require('textlint-rule-max-appearence-count-of-words');

var _textlintRuleMaxAppearenceCountOfWords2 = _interopRequireDefault(_textlintRuleMaxAppearenceCountOfWords);

var _textlintRuleMaxLengthOfTitle = require('textlint-rule-max-length-of-title');

var _textlintRuleMaxLengthOfTitle2 = _interopRequireDefault(_textlintRuleMaxLengthOfTitle);

var _textlintRuleNgWord = require('textlint-rule-ng-word');

var _textlintRuleNgWord2 = _interopRequireDefault(_textlintRuleNgWord);

// rule config

var _ruleConfigAppearenceCountOfWordsJson = require('../ruleConfig/appearenceCountOfWords.json');

var _ruleConfigAppearenceCountOfWordsJson2 = _interopRequireDefault(_ruleConfigAppearenceCountOfWordsJson);

var _ruleConfigMaxLengthOfTitleJson = require('../ruleConfig/maxLengthOfTitle.json');

var _ruleConfigMaxLengthOfTitleJson2 = _interopRequireDefault(_ruleConfigMaxLengthOfTitleJson);

var _ruleConfigNgWordJson = require('../ruleConfig/ngWord.json');

var _ruleConfigNgWordJson2 = _interopRequireDefault(_ruleConfigNgWordJson);

var _lodash = require('lodash');

var _github = require('github');

var GitHubApi = _interopRequireWildcard(_github);

var textlint = new _textlint.TextLintCore();
textlint.setupRules({
  'ja-yahoo-kousei': _textlintRuleJaYahooKousei2['default'],
  'max-appearence-count-of-words': _textlintRuleMaxAppearenceCountOfWords2['default'],
  'max-length-of-title': _textlintRuleMaxLengthOfTitle2['default'],
  'ng-word': _textlintRuleNgWord2['default']
}, {
  'max-appearence-count-of-words': _ruleConfigAppearenceCountOfWordsJson2['default'],
  'max-length-of-title': _ruleConfigMaxLengthOfTitleJson2['default'],
  'ng-word': _ruleConfigNgWordJson2['default']
});

var github = new GitHubApi({
  version: "3.0.0",
  debug: true,
  protocol: "https"
});
github.authenticate({
  type: "oauth",
  token: process.env.GITHUB_API_KEY
});

// ignore NOT PullRequest
if (!process.env.CI_PULL_REQUEST) process.exit();

// initialize
var match = process.env.CI_PULL_REQUEST.match(/\d+$/);
var PR_NUMBER = match[0];

var ghSetting = {
  user: process.env.GITHUB_USERNAME,
  repo: process.env.CIRCLE_PROJECT_REPONAME,
  number: PR_NUMBER
};

// run
function getChangedText() {
  var _this = this;

  return new Promise(function (resolve, reject) {
    _this.github.pullRequests.getFiles(ghSetting, function (error, data) {
      if (error) return reject(error);

      var file = (0, _lodash.find)(data, function (f) {
        return f.filename.indexOf('.md') !== -1;
      });

      console.log("success getFiles() : ", file);

      if (!file) return reject(new Error('file not found'));

      _this.github.repos.getContent(extend({}, ghSetting, {
        ref: process.env.CIRCLE_SHA1,
        path: file.filename
      }), function (error, data) {
        if (error) return reject(error);

        var buffer = new Buffer(data.content, data.encoding);
        var content = buffer.toString();

        console.log("success getContent() : ", content);
        resolve(content);
      });
    });
  });
}

function postComment(text) {
  var _this2 = this;

  return new Promise(function (resolve, reject) {
    _this2.github.issues.createComment(extend({}, ghSetting, { body: text }), function (error, data) {
      if (error) console.log(error);
      // DO NOTHING
    });
  });
}

getChangedText.then(function (text) {

  return textlint.lintMarkdown(text);
}).then(function (result) {

  return postComment(reduce(result.mesasges, function (sum, m) {
    return '' + sum + m.message + '\n';
  }));
}).then(function (__) {
  // ok
})['catch'](function (error) {
  console.error(error);
});