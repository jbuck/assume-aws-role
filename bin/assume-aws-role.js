#!/usr/bin/env node

var AWS = require("aws-sdk");
var fs = require("fs-extra")
var path = require("path");
var spawn = require("child_process").spawn;

var command = process.argv[2];
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

if (!command) {
  console.error("Usage: assume-aws-role add <alias> <role-arn> [mfa-arn]");
  console.error("       assume-aws-role delete <alias>");
  console.error("       assume-aws-role list");
  console.error("       assume-aws-role <alias> [mfa-token]");
  process.exit(1);
}

if (command === "add") {
  var alias = process.argv[3];
  var role = process.argv[4];
  var mfa = process.argv[5];

  if (!alias) {
    console.error("No alias specified");
    console.error("Usage: assume-aws-role add <alias> <role-arn> [mfa-arn]");
    process.exit(1);
  }
  if (!role) {
    console.error("No role ARN specified");
    console.error("Usage: assume-aws-role add <alias> <role-arn> [mfa-arn]");
    process.exit(1);
  }
  if (!home) {
    console.error("Cannot save credentials, $HOME path not set");
    process.exit(1);
  }

  var config = readConfig(filename);

  config[alias] = {
    RoleArn: role
  };
  if (!!mfa) {
    config[alias].SerialNumber = mfa
  }

  fs.outputJsonSync(filename, config);
  process.exit(0);
}

if (command == "list") {
	var config = readConfig(filename);
	var aliases = Object.keys(config);
  	console.log("Defined aliases: %s" , aliases);
  	process.exit(0);
}

if (command == "delete") {
	var alias = process.argv[3];
	if (!alias) {
	    console.error("No alias specified");
	    console.error("Usage: assume-aws-role delete <alias>");
	    process.exit(1);
	}
	var config = readConfig(filename);
	var role = config[alias];
	if (!role) {
	    console.error("The specified alias does not exist");
	    process.exit(1);
	}
	delete config[alias];
	fs.outputJsonSync(filename, config);
	process.exit(0);
}

var config = readConfig(filename);
if (!config[command]) {
  console.error("%s not found.", command);

  var aliases = Object.keys(config);
  if (aliases.length === 0) {
    console.error("You need to add an alias before you can use it");
    console.error("Usage: assume-aws-role add <alias> <role-arn> [mfa-arn]");
  } else {
    console.error("Did you mean:");
    console.error(aliases.map(function(a) {
      return "  " + a
    }).join("\n"))
    console.error("assume-aws-role <alias> [mfa-token]");
  }

  process.exit(1);
}

var role = config[command];
var token = process.argv[3];

if (role.SerialNumber && !token) {
  console.error("You need to specify your MFA token to assume this role");
  console.error("assume-aws-role <alias> [mfa-token]");
  process.exit(1);
}

var STS = new AWS.STS();
STS.assumeRole({
  RoleArn: role.RoleArn,
  RoleSessionName: "assume-aws-role-cli",
  SerialNumber: role.SerialNumber,
  TokenCode: token,
  DurationSeconds: role.DurationSeconds
}, function(error, data) {
  if (error) {
    console.error(error);
    process.exit(1);
  }

  var modEnv = process.env;
  modEnv.AWS_ACCESS_KEY_ID = data.Credentials.AccessKeyId;
  modEnv.AWS_SECRET_ACCESS_KEY = data.Credentials.SecretAccessKey;
  modEnv.AWS_SESSION_TOKEN = data.Credentials.SessionToken;
  modEnv.AWS_SESSION_TOKEN_EXPIRATION = data.Credentials.Expiration

  // required for boto sts to work
  modEnv.AWS_SECURITY_TOKEN = data.Credentials.SessionToken;
  modEnv.PS1 = "(assume-aws-role " + command + ")$ ";
  modEnv.ASSUME_AWS_ROLE = command;

  var sh = spawn(process.env.SHELL, {
    env: modEnv,
    stdio: "inherit"
  });

  sh.on('close',(code)=>{
       process.exit(code);
  });

});
