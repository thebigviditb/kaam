"""Per-environment resources: Cognito user pool, private S3 media bucket, API IAM user."""

import aws_cdk as cdk
from aws_cdk import aws_cognito as cognito
from aws_cdk import aws_iam as iam
from aws_cdk import aws_s3 as s3
from constructs import Construct


class KaamStack(cdk.Stack):
    def __init__(self, scope: Construct, id: str, *, env_name: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        is_prod = env_name == "prod"

        # ---- Cognito ----
        # Passwordless: workers sign in with a phone number + SMS code, households with
        # phone or email + code. ESSENTIALS is the feature plan that enables OTP factors.
        pool = cognito.UserPool(
            self,
            "UserPool",
            user_pool_name=f"kaam-{env_name}",
            feature_plan=cognito.FeaturePlan.ESSENTIALS,
            self_sign_up_enabled=True,
            sign_in_aliases=cognito.SignInAliases(email=True, phone=True),
            auto_verify=cognito.AutoVerifiedAttrs(email=True, phone=True),
            sign_in_policy=cognito.SignInPolicy(
                allowed_first_auth_factors=cognito.AllowedFirstAuthFactors(
                    password=True, sms_otp=True, email_otp=True
                )
            ),
            standard_attributes=cognito.StandardAttributes(
                email=cognito.StandardAttribute(required=False, mutable=True),
                phone_number=cognito.StandardAttribute(required=False, mutable=True),
            ),
            sms_role_external_id=f"kaam-{env_name}-sms",
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_lowercase=False,
                require_uppercase=False,
                require_digits=False,
                require_symbols=False,
            ),
            account_recovery=cognito.AccountRecovery.PHONE_WITHOUT_MFA_AND_EMAIL,
            user_verification=cognito.UserVerificationConfig(
                email_subject="Your Kaam verification code",
                email_body="Your Kaam verification code is {####}",
                email_style=cognito.VerificationEmailStyle.CODE,
            ),
            removal_policy=cdk.RemovalPolicy.RETAIN if is_prod else cdk.RemovalPolicy.DESTROY,
            deletion_protection=is_prod,
        )
        client = pool.add_client(
            "WebClient",
            user_pool_client_name=f"kaam-{env_name}-web",
            auth_flows=cognito.AuthFlow(user=True, user_srp=True, user_password=True),
            generate_secret=False,
            access_token_validity=cdk.Duration.hours(1),
            refresh_token_validity=cdk.Duration.days(30),
            prevent_user_existence_errors=True,
        )

        # ---- Media bucket (private; browser uploads via presigned PUT) ----
        bucket = s3.Bucket(
            self,
            "MediaBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
            enforce_ssl=True,
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
                    allowed_origins=["*"],
                    allowed_headers=["*"],
                    max_age=3600,
                )
            ],
            removal_policy=cdk.RemovalPolicy.RETAIN if is_prod else cdk.RemovalPolicy.DESTROY,
            auto_delete_objects=not is_prod,
        )

        # ---- IAM user whose access key the API (on Vercel) uses ----
        api_user = iam.User(self, "ApiUser", user_name=f"kaam-{env_name}-api")
        bucket.grant_read_write(api_user)
        bucket.grant_delete(api_user)

        cdk.CfnOutput(self, "UserPoolId", value=pool.user_pool_id)
        cdk.CfnOutput(self, "UserPoolClientId", value=client.user_pool_client_id)
        cdk.CfnOutput(self, "MediaBucketName", value=bucket.bucket_name)
        cdk.CfnOutput(self, "ApiUserName", value=api_user.user_name)
