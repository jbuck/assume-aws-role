#!/usr/bin/env node

var AWS = require("aws-sdk");
var fs = require("fs-extra")
var path = require("path");
var spawn = require("child_process").spawn;
var program = require("commander");

var isWin = /^win/.test(process.platform);
var home = process.env.HOME ||
           process.env.USERPROFILE ||
           (process.env.HOMEPATH ? ((process.env.HOMEDRIVE || 'C:/') + process.env.HOMEPATH) : null);
var filename = path.join(home, ".assume-aws-role", "config");
var readConfig = function(filename) {
  var config = {};

  try {
    config = fs.readJsonSync(filename, {throws: false});
  } catch (read_error) {
    if (read_error.code != 'ENOENT') {
      throw read_error;
    }
  }

  return config;
};

var addProfile = function(profile, role, mfa, awsprofile) {
  if (!home) {
    console.error("Cannot save credentials, $HOME path not set");
    process.exit(1);
  }

  var config = readConfig(filename);

  config[profile] = {
    RoleArn: role
  };
  if (!!mfa) {
    config[profile].SerialNumber = mfa
  }
  if (!!awsprofile) {
    config[profile].awsprofile = awsprofile;
  }

  fs.outputJsonSync(filename, config);
  process.exit(0);
  return this;
};

var listProfiles = function(){
  var config = readConfig(filename);
  var profiles = Object.keys(config);
  console.log("Defined profiles: %s" , profiles);
  process.exit(0);
}

var deleteProfile = function (profile) {
	var config = readConfig(filename);
	var role = config[profile];
	if (!role) {
	    console.error("The specified profile does not exist");
	    process.exit(1);
	}
	delete config[profile];
	fs.outputJsonSync(filename, config);
	process.exit(0);
}

var assumeRoleWithProfile = function(profile, token) {
  var config = readConfig(filename);
  if (!config[profile]) {
    console.error("%s not found.", profile);
  
    var profiles = Object.keys(config);
    if (profiles.length === 0) {
      console.error("You need to add an profile before you can use it");
      console.error("Usage: assume-aws-role add <profile> <role-arn> [mfa-arn]");
    } else {
      console.error("Did you mean:");
      console.error(profiles.map(function(a) {
        return "  " + a
      }).join("\n"))
      console.error("assume-aws-role <profile> [mfa-token]");
    }
  
    process.exit(1);
  }
  
  var role = config[profile];
  
  if (role.SerialNumber && !token) {
    console.error("You need to specify your MFA token to assume this role");
    console.error("assume-aws-role <profile> [mfa-token]");
    process.exit(1);
  }
  
  var params = {};
  if (!!role.awsprofile) {
    var creds = new AWS.SharedIniFileCredentials({profile: role.awsprofile});
    params.credentials = creds;
  }

  var STS = new AWS.STS(params);
  STS.assumeRole({
    RoleArn: role.RoleArn,
    RoleSessionName: "assume-aws-role-cli",
    SerialNumber: role.SerialNumber,
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
  .version('1.0.0');

program
  .command('add <profile> <rolearn>')
  .option("-a, --aws-profile [awsprofile]", "Specify the aws credentials profile for the user")
  .option("-m, --mfa-arn [mfaarn]", "Specify the MFA arn")
  .action(function(profile, rolearn, options) {
    addProfile(profile, rolearn, options.mfaArn, options.awsProfile);
  });

program
  .command('delete <profile>')
  .action(function(profile){
    deleteProfile(profile);
  });

program
  .command('list')
  .action(function(){
    listProfiles();
  });

program
  .command('*')
  .option("-t, --mfa-token [mfatoken]", "Specify the MFA token")
  .action(function(profile, options) {
    assumeRoleWithProfile(profile, options.mfaToken);
});

program.parse(process.argv);
