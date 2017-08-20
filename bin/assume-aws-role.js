#!/usr/bin/env node

var AWS = require("aws-sdk");
var fs = require("fs-extra")
var path = require("path");
var spawn = require("child_process").spawn;
var program = require("commander");
var ini = require('ini');

var pjson = require('../package.json');

var isWin = /^win/.test(process.platform);
var home = process.env.HOME ||
           process.env.USERPROFILE ||
           (process.env.HOMEPATH ? ((process.env.HOMEDRIVE || 'C:/') + process.env.HOMEPATH) : null);
var filename = path.join(home, ".assume-aws-role", "config");
var awsConfigFilename = path.join(home, ".aws", "config");

var readConfigIni = function(filepath) {
  var config = ini.parse(fs.readFileSync(filepath, 'utf-8'));
  return config;
}

var assumeRoleWithProfile = function(profile, token) {
  var awsprofile = {};
  var awsconfig = readConfigIni(awsConfigFilename);
  if (!awsconfig[profile]) {
    if (!awsconfig['profile ' + profile]) {
      console.error("%s not found.", profile);
      process.exit(1);
    } else {
      awsprofile = awsconfig['profile ' + profile];
    }
  } else {
    awsprofile = awsconfig[profile];
  }
  
  var params = {};
  if (!!awsprofile.source_profile) {
    var creds = new AWS.SharedIniFileCredentials({profile: awsprofile.source_profile});
    params.credentials = creds;
  }

  var STS = new AWS.STS(params);
  STS.assumeRole({
    RoleArn: awsprofile.role_arn,
    RoleSessionName: "assume-aws-role-cli",
    SerialNumber: awsprofile.mfa_serial,
    TokenCode: token
  }, function(error, data) {
    if (error) {
      console.error(error);
      process.exit(1);
    }
  
    var modEnv = process.env;
    modEnv.AWS_ACCESS_KEY_ID = data.Credentials.AccessKeyId;
    modEnv.AWS_SECRET_ACCESS_KEY = data.Credentials.SecretAccessKey;
    modEnv.AWS_SESSION_TOKEN = data.Credentials.SessionToken;

    if (!!awsprofile.region) {
      modEnv.AWS_DEFAULT_REGION = awsprofile.region;
    }
    if (!!awsprofile.output) {
      modEnv.AWS_DEFAULT_OUTPUT = awsprofile.output;
    }
  
    // required for boto sts to work
    modEnv.AWS_SECURITY_TOKEN = data.Credentials.SessionToken;
    modEnv.PS1 = "(assume-aws-role " + profile + ")$ ";
    modEnv.ASSUME_AWS_ROLE = profile;
  
    var spawnProc = process.env.SHELL;
    if (isWin) {
      spawnProc = process.env.comspec
    }
    spawn(spawnProc, {
      env: modEnv,
      stdio: "inherit"
    });
  });
}


program
  .version(pjson.version);

program
  .command('*')
  .option("-t, --mfa-token [mfatoken]", "Specify the MFA token")
  .action(function(profile, options) {
    assumeRoleWithProfile(profile, options.mfaToken);
});

program.parse(process.argv);
