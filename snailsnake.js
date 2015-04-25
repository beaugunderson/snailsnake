#!/usr/bin/env node

'use strict';

var botUtilities = require('bot-utilities');
var fs = require('fs');
var Twit = require('twit');
var _ = require('lodash');

function getLines(filename) {
  return fs.readFileSync(filename, {encoding: 'utf8'}).split('\n');
}

var examples = getLines('./examples.txt');
var nouns = getLines('./nouns.txt');

// remove words that already start with sn
nouns = _.reject(nouns, function (noun) {
  return noun.match(/^sn/);
});

function nounRegEx(noun) {
  return new RegExp('(^|\\s)' + noun + '(\\s|$)');
}

function snake(noun, snoun, text) {
  var snakeText = 'snake ' + noun + ', or ' + snoun + ',';
  var re = nounRegEx(noun);
  var snakeExample = text.replace(re, '$1' + snakeText + '$2');

  return snakeExample.replace(/,$/, '');
}

function snail(noun, snoun, text) {
  var snailText = snoun + ' (snail ' + noun + ')';
  var re = nounRegEx(noun);

  return text.replace(re, '$1' + snailText + '$2');
}

function candidate() {
  var noun = _.sample(nouns);
  var firstVowel = noun.search(/[aeiouyn]/i);
  var snoun = 'sn' + noun.slice(firstVowel);

  snoun = snoun.replace(/^snn/, 'sn');

  var possibleExamples = examples.filter(function (example) {
    return example.toLowerCase().indexOf(noun.toLowerCase()) !== -1;
  });

  var candidates = [];

  possibleExamples.forEach(function (example) {
    var snailExample = snail(noun, snoun, example);
    var snakeExample = snake(noun, snoun, example);

    if (snakeExample !== snailExample) {
      candidates.push(snailExample);
      candidates.push(snakeExample);
    }
  });

  candidates = candidates.filter(function (example) {
    return example.length <= 140;
  });

  return _.sample(candidates);
}

var program = require('commander');

program
  .command('tweet')
  .description('Generate and tweet a sneme')
  .option('-r, --random', 'only post a percentage of the time')
  .action(botUtilities.randomCommand(function () {
    var T = new Twit(botUtilities.getTwitterAuthFromEnv());

    var sneme;

    do {
      sneme = candidate();
    } while (!sneme);

    T.post('statuses/update', {status: sneme},
        function (err, data, response) {
      if (err || response.statusCode !== 200) {
        console.log('Error sending tweet', err, response.statusCode);

        return;
      }

      console.log('Done.');
    });
  }));

program.parse(process.argv);
