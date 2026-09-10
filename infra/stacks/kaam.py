"""Per-environment resources: Cognito user pool, private S3 media bucket, API IAM user."""

from pathlib import Path

import aws_cdk as cdk
from aws_cdk import aws_cognito as cognito
from aws_cdk import aws_iam as iam
from aws_cdk import aws_lambda as lambda_
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_secretsmanager as sm
from constructs import Construct

AUTH_LAMBDA_DIR = Path(__file__).resolve().parent.parent / "lambda" / "auth-challenge"


class KaamStack(cdk.Stack):
    def __init__(self, scope: Construct, id: str, *, env_name: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        is_prod = env_name == "prod"

        # ---- Cognito ----
        # ---- Phone login via Twilio Verify ----
        # US carriers block SMS from unregistered numbers, so instead of Cognito's own SMS
        # we run a CUSTOM_AUTH challenge: Twilio Verify sends and checks the code.
        twilio_secret = sm.Secret(
            self,
            "TwilioSecret",
            secret_name=f"kaam/{env_name}/twilio",
            description="Twilio: accountSid, authToken, verifyServiceSid, fromNumber",
            secret_object_value={
                "accountSid": cdk.SecretValue.unsafe_plain_text("REPLACE_ME"),
                "authToken": cdk.SecretValue.unsafe_plain_text("REPLACE_ME"),
                "verifyServiceSid": cdk.SecretValue.unsafe_plain_text("REPLACE_ME"),
                "fromNumber": cdk.SecretValue.unsafe_plain_text("+10000000000"),
            },
        )

        def trigger(name: str) -> lambda_.Function:
            fn = lambda_.Function(
                self,
                name,
                runtime=lambda_.Runtime.NODEJS_20_X,
                handler=f"{name[0].lower()}{name[1:]}.handler",
                code=lambda_.Code.from_asset(str(AUTH_LAMBDA_DIR)),
                timeout=cdk.Duration.seconds(15),
                environment={"TWILIO_SECRET_ARN": twilio_secret.secret_arn},
            )
            twilio_secret.grant_read(fn)
            return fn

        pre_sign_up = trigger("PreSignUp")
        define_auth = trigger("DefineAuthChallenge")
        create_auth = trigger("CreateAuthChallenge")
        verify_auth = trigger("VerifyAuthChallengeResponse")

        # Passwordless: workers sign in with a phone number + SMS code, households with
        # phone or email + code. ESSENTIALS is the feature plan that enables OTP factors.
        # "UserPoolV2": sign-in attributes can't change in place, so the passwordless
        # switch replaced the original pool. Bump this id again if that ever recurs.
        pool = cognito.UserPool(
            self,
            "UserPoolV2",
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
            lambda_triggers=cognito.UserPoolTriggers(
                pre_sign_up=pre_sign_up,
                define_auth_challenge=define_auth,
                create_auth_challenge=create_auth,
                verify_auth_challenge_response=verify_auth,
            ),
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
            auth_flows=cognito.AuthFlow(user=True, user_srp=True, user_password=True, custom=True),
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
        cdk.CfnOutput(self, "TwilioSecretName", value=twilio_secret.secret_name)
