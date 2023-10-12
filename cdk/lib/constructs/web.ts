import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as waf from 'aws-cdk-lib/aws-wafv2';
import * as agw from 'aws-cdk-lib/aws-apigateway';
import * as idPool from '@aws-cdk/aws-cognito-identitypool-alpha';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';
import { NodejsBuild } from 'deploy-time-build';

export interface WebProps {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  identityPool: idPool.IdentityPool;
  webAclCloudFront: waf.CfnWebACL;
  api: agw.RestApi;
  predictStreamFunction: lambda.NodejsFunction;
}

export class Web extends Construct {
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: WebProps) {
    super(scope, id);

    // -----
    // Frontend のデプロイ
    // -----

    const { cloudFrontWebDistribution, s3BucketInterface } = new CloudFrontToS3(
      this,
      'Frontend',
      {
        insertHttpSecurityHeaders: false,
        bucketProps: {
          blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
          encryption: s3.BucketEncryption.S3_MANAGED,
          enforceSSL: true,
          autoDeleteObjects: true,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        },
        loggingBucketProps: {
          objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
          autoDeleteObjects: true,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
          serverAccessLogsPrefix: 'logs',
        },
        cloudFrontLoggingBucketProps: {
          objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
          autoDeleteObjects: true,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
          serverAccessLogsPrefix: 'logs',
        },
        cloudFrontDistributionProps: {
          geoRestriction: cloudfront.GeoRestriction.allowlist('JP'),
          webAclId: props.webAclCloudFront.attrArn,
        },
      }
    );

    new NodejsBuild(this, 'WebKendra', {
      assets: [
        {
          path: '../',
          exclude: [
            '.git',
            'node_modules',
            'cdk',
            'docs',
            'imgs',
            'web-lexv2',
            'web-kendra/build',
            'web-kendra/node_modules',
          ],
        },
      ],
      destinationBucket: s3BucketInterface,
      distribution: cloudFrontWebDistribution,
      outputSourceDirectory: 'web-kendra/build',
      buildCommands: [
        'npm install -w web-kendra',
        'npm run build -w web-kendra',
      ],
      buildEnvironment: {
        REACT_APP_API_ENDPOINT: `${props.api.url}kendra`,
        REACT_APP_IDENTITY_POOL_ID: props.identityPool.identityPoolId,
        REACT_APP_REGION: cdk.Stack.of(this).region,
        // Cognito の環境情報を設定
        REACT_APP_USER_POOL_ID: props.userPool.userPoolId,
        REACT_APP_USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
        // StreamingResponse の Lambda 関数
        REACT_APP_PREDICT_STREAM_FUNCTION_ARN:
          props.predictStreamFunction.functionArn,
      },
    });

    this.distribution = cloudFrontWebDistribution;
  }
}
