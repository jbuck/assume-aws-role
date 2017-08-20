# assume-aws-role

Work with multiple AWS accounts more easily.

If you currently manage multiple AWS accounts and use role switching to do work in them, this is the tool for you!

## Requirements

* [nodejs](https://nodejs.org/download/) v0.12 or higher

## Prerequisites

Configured profile with AWS CLI for cross account access.

## Usage

First, you need to install the tool from NPM:

`npm install -g assume-aws-role`

You can assume the role for profile sandbox:

`assume-aws-role sandbox --mfa-token 123456`

Now you've got a shell with your temporary security credentials in the environment:

`(assume-aws-role sandbox)$ `

## How does it work?

Profiles are configured per [Configuring the AWS CLI](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html).

`assume-aws-role` uses the [STS:AssumeRole API](http://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html) to assume the role you specified.

After receiving valid credentials `assume-aws-role` will spawn the shell specified in `$SHELL` with the environment modified to include `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN`. The environment also includes an overridden `PS1` with a minimal custom prompt, and `ASSUME_AWS_ROLE` with the role so you can fully customize the `PS1` prompt by yourself.
