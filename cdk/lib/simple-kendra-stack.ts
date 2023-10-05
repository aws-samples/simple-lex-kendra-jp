import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as kendra from 'aws-cdk-lib/aws-kendra';
import * as waf from 'aws-cdk-lib/aws-wafv2';
import { KendraIndex, Auth, Api, Web, S3DataSource, CustomDataSource } from './constructs';
import { NagSuppressions } from 'cdk-nag';

export interface SimpleKendraStackProps extends cdk.StackProps {
  webAclCloudFront: waf.CfnWebACL;
}

export class SimpleKendraStack extends cdk.Stack {
  public readonly index: kendra.CfnIndex;

  constructor(scope: Construct, id: string, props: SimpleKendraStackProps) {
    super(scope, id, props);

    const auth = new Auth(this, 'Auth');

    const kendraIndex = new KendraIndex(this, 'KendraIndex', {
      userPool: auth.userPool,
    });

    const s3DataSource = new S3DataSource(this, 'S3DataSource', {
      index: kendraIndex.index,
    });

    new CustomDataSource(this, 'CustomDataSource', {
      index: kendraIndex.index,
    });

    const api = new Api(this, 'Api', {
      index: kendraIndex.index,
      userPool: auth.userPool,
    });

    const web = new Web(this, 'Web', {
      userPool: auth.userPool,
      userPoolClient: auth.userPoolClient,
      dataSourceBucket: s3DataSource.bucket,
      webAclCloudFront: props.webAclCloudFront,
      api: api.api,
    });

    // -----
    // Stack の出力を定義
    // -----

    new cdk.CfnOutput(this, 'DataSourceBucketName', {
      value: s3DataSource.bucket.bucketName,
    });

    new cdk.CfnOutput(this, 'KendraIndexId', {
      value: kendraIndex.index.ref,
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: web.identityPool.identityPoolId,
    });

    new cdk.CfnOutput(this, 'KendraSampleFrontend', {
      value: `https://${web.distribution.distributionDomainName}`,
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: auth.userPool.userPoolId,
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolClientId', {
      value: auth.userPoolClient.userPoolClientId,
    });

    this.index = kendraIndex.index;

    NagSuppressions.addStackSuppressions(this, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'Managed role is allowed is this case',
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Wildcard permission is allowed in this case',
      },
      {
        id: 'AwsSolutions-APIG2',
        reason: 'Validation method for REST API is not required',
      },
      {
        id: 'AwsSolutions-APIG4',
        reason: 'Authorization is not required for this API',
      },
      {
        id: 'AwsSolutions-COG4',
        reason: 'Cognito authorizer is not required for this API',
      },
      {
        id: 'AwsSolutions-COG7',
        reason: 'Unauthorized user is allowed to download file from S3',
      },
      {
        id: 'AwsSolutions-CFR4',
        reason: 'Allow to use default certificate',
      },
      {
        id: 'AwsSolutions-CB4',
        reason: 'KMS is not used, because Codebuild is encrypted by default',
      },
      {
        id: 'AwsSolutions-L1',
        reason: 'Using non-latest runtime in aws-cdk-lib/aws-s3-deployment',
      },
      {
        id: 'AwsSolutions-COG2',
        reason: 'The Cognito user pool does not require MFA',
      },
      // FIXME: 本番環境では以下の Suppression の削除を推奨します
      {
        id: 'AwsSolutions-COG1',
        reason: 'Password policy is loose for demo',
      },
    ]);
  }
}
