# assume-aws-role

Work with multiple AWS accounts more easily.

If you currently manage multiple AWS accounts and use role switching to do work in them, this is the tool for you!

## Requirements

* [nodejs](https://nodejs.org/download/) v0.12 or higher

## Usage

First, you need to install the tool from NPM:

`npm install -g assume-aws-role`

Next, you need to add a role that you'd like to assume. As an example, lets say I wanted to add the Administrator role for my sandbox account with MFA required:

```
assume-aws-role add sandbox \
  "arn:aws:iam::123456789012:role/Administrator" \
  "arn:aws:iam::109876543210:mfa/jbuck"
```

Now you can assume that role we just added:

`assume-aws-role sandbox 123456`

Now you've got a shell with your temporary security credentials in the environment:

`(assume-aws-role sandbox)$ `

You can also add roles without MFA devices:

```
assume-aws-role add sandbox \
  "arn:aws:iam::123456789012:role/Administrator"
```

You can list all the defined roles with a single command:

`assume-aws-role list`

You can delete a defined alias with a single command:

`assume-aws-role delete <alias>`

## How does it work?

Any roles you add are stored in `~/.assume-aws-role/config`. It's optional but highly recommended that you use a MFA device.

`assume-aws-role` uses the [STS:AssumeRole API](http://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html) to assume the role you specified.

After receiving valid credentials `assume-aws-role` will spawn the shell specified in `$SHELL` with the environment modified to include `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN`. The environment also includes an overridden `PS1` with a minimal custom prompt, and `ASSUME_AWS_ROLE` with the role so you can fully customize the `PS1` prompt by yourself.
