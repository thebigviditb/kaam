import aws_cdk as cdk
from aws_cdk.assertions import Template

from stacks.github import GithubOidcStack
from stacks.kaam import KaamStack


def test_kaam_stack_synth():
    app = cdk.App()
    t = Template.from_stack(KaamStack(app, "t", env_name="staging"))
    t.resource_count_is("AWS::Cognito::UserPool", 1)
    t.resource_count_is("AWS::Cognito::UserPoolClient", 1)
    t.resource_count_is("AWS::S3::Bucket", 1)
    t.resource_count_is("AWS::IAM::User", 1)


def test_github_stack_synth():
    app = cdk.App()
    t = Template.from_stack(GithubOidcStack(app, "g", repo="thebigviditb/kaam"))
    t.has_resource_properties("AWS::IAM::Role", {"RoleName": "kaam-github-deploy"})
