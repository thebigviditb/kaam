"""GitHub Actions -> AWS trust via OIDC. Deployed once per account."""

import aws_cdk as cdk
from aws_cdk import aws_iam as iam
from constructs import Construct


class GithubOidcStack(cdk.Stack):
    def __init__(self, scope: Construct, id: str, *, repo: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        owner, name = repo.split("/", 1)

        provider = iam.OpenIdConnectProvider(
            self,
            "GithubProvider",
            url="https://token.actions.githubusercontent.com",
            client_ids=["sts.amazonaws.com"],
        )

        role = iam.Role(
            self,
            "DeployRole",
            role_name="kaam-github-deploy",
            assumed_by=iam.WebIdentityPrincipal(
                provider.open_id_connect_provider_arn,
                conditions={
                    "StringEquals": {
                        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
                    },
                    # GitHub issues subs both as repo:owner/name:* and, newer, with
                    # numeric ids: repo:owner@123/name@456:*. Accept either.
                    "StringLike": {
                        "token.actions.githubusercontent.com:sub": [
                            f"repo:{repo}:*",
                            f"repo:{owner}@*/{name}@*:*",
                        ]
                    },
                },
            ),
            max_session_duration=cdk.Duration.hours(1),
        )
        # CDK deploys by assuming the bootstrap roles; that is all this role needs.
        role.add_to_policy(
            iam.PolicyStatement(
                actions=["sts:AssumeRole"],
                resources=[f"arn:aws:iam::{self.account}:role/cdk-*"],
            )
        )

        cdk.CfnOutput(self, "DeployRoleArn", value=role.role_arn)
