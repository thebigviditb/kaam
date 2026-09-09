import os

import aws_cdk as cdk

from stacks.github import GithubOidcStack
from stacks.kaam import KaamStack

app = cdk.App()
env = cdk.Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region=os.environ.get("CDK_DEFAULT_REGION", "us-west-2"),
)

# One-time, account-wide: lets GitHub Actions deploy without stored AWS keys.
GithubOidcStack(app, "kaam-github", repo=app.node.try_get_context("github_repo"), env=env)

KaamStack(app, "kaam-staging", env_name="staging", env=env)
KaamStack(app, "kaam-prod", env_name="prod", env=env)

app.synth()
