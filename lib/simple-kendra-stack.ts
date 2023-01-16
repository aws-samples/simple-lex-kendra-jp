import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as kendra from 'aws-cdk-lib/aws-kendra';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as agw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as idPool from '@aws-cdk/aws-cognito-identitypool-alpha';
import { NodejsBuild } from 'deploy-time-build';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';

export class SimpleKendraStack extends cdk.Stack {
  public readonly index: kendra.CfnIndex;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // -----
    // Kendra Index の作成
    // -----

    // Index 用の IAM Role を作成
    const indexRole = new iam.Role(this, 'KendraIndexRole', {
      assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
    });

    indexRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['s3:GetObject'],
      })
    );

    indexRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess')
    );

    const index = new kendra.CfnIndex(this, 'KendraIndex', {
      name: 'simple-index-by-cdk',
      edition: 'DEVELOPER_EDITION',
      roleArn: indexRole.roleArn,
      userContextPolicy: 'ATTRIBUTE_FILTER',
    });

    // -----
    // Kendra Data Source の作成
    // -----

    // .pdf や .txt などのドキュメントを格納する S3 Bucket
    const dataSourceBucket = new s3.Bucket(this, 'DataSourceBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // /docs ディレクトリを Bucket にアップロードする
    new s3Deploy.BucketDeployment(this, 'DeployDocs', {
      sources: [s3Deploy.Source.asset('./docs')],
      destinationBucket: dataSourceBucket,
      destinationKeyPrefix: 'docs',
    });

    const dataSourceRole = new iam.Role(this, 'DataSourceRole', {
      assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
    });

    dataSourceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:s3:::${dataSourceBucket.bucketName}`],
        actions: ['s3:ListBucket'],
      })
    );

    dataSourceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:s3:::${dataSourceBucket.bucketName}/*`],
        actions: ['s3:GetObject'],
      })
    );

    dataSourceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [cdk.Token.asString(index.getAtt('Arn'))],
        actions: ['kendra:BatchPutDocument', 'kendra:BatchDeleteDocument'],
      })
    );

    // S3 Bucket 用の Data Source の作成
    new kendra.CfnDataSource(this, 'S3DataSource', {
      indexId: index.ref,
      name: 's3-data-source',
      roleArn: dataSourceRole.roleArn,
      type: 'S3',
      dataSourceConfiguration: {
        s3Configuration: {
          bucketName: dataSourceBucket.bucketName,
          inclusionPrefixes: ['docs'],
        },
      },
    });

    // ---
    // FAQ の作成
    // ---
    const faqBucket = new s3.Bucket(this, 'FaqBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    new s3Deploy.BucketDeployment(this, 'DeployFaq', {
      sources: [s3Deploy.Source.asset('./faq')],
      destinationBucket: faqBucket,
      destinationKeyPrefix: 'faq',
    });

    const faqRole = new iam.Role(this, 'FaqRole', {
      assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
    });

    faqRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:s3:::${faqBucket.bucketName}/*`],
        actions: ['s3:GetObject'],
      })
    );

    // デフォルト言語を日本語に設定できないため無効化
    // 現状は手動で対応が必要
    // new kendra.CfnFaq(this, 'Faq', {
    //   indexId: index.ref,
    //   name: 'simple-faq',
    //   roleArn: faqRole.roleArn,
    //   s3Path: {
    //     bucket: faqBucket.bucketName,
    //     key: 'faq/simple.csv',
    //   },
    //   fileFormat: 'CSV',
    // });

    // ---
    // Kendra 用の API を作成
    // ---

    const kendraFunc = new lambda.NodejsFunction(this, 'KendraFunc', {
      entry: './lambda/kendra.ts',
      timeout: cdk.Duration.minutes(3),
      environment: {
        INDEX_ID: index.ref,
        REGION: this.region,
      },
      depsLockFilePath: './lambda/package-lock.json',
      bundling: {
        commandHooks: {
          beforeBundling: (i, __) => [`cd ${i} && npm ci`],
          afterBundling: (_, __) => [],
          beforeInstall: (_, __) => [],
        },
      },
    });

    // Lambda から Kendra を呼び出せるように権限を付与
    kendraFunc.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [cdk.Token.asString(index.getAtt('Arn'))],
        actions: ['kendra:Query'],
      })
    );

    const kendraApi = new agw.RestApi(this, 'KendraApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: agw.Cors.ALL_ORIGINS,
        allowMethods: agw.Cors.ALL_METHODS,
      },
    });

    kendraApi.addGatewayResponse('KendraApi4xx', {
      type: agw.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Credentials': "'true'",
      },
    });

    kendraApi.addGatewayResponse('KendraApi5xx', {
      type: agw.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Credentials': "'true'",
      },
    });

    const kendraEndpoint = kendraApi.root.addResource('kendra');
    kendraEndpoint.addMethod('POST', new agw.LambdaIntegration(kendraFunc));

    // -----
    // Identity Pool の作成
    // -----

    const identityPool = new idPool.IdentityPool(
      this,
      'IdentityPoolForKendra',
      {
        allowUnauthenticatedIdentities: true,
      }
    );

    // Unauthorized User に以下の権限 (S3) を付与
    identityPool.unauthenticatedRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject'],
        resources: [dataSourceBucket.arnForObjects('*')],
      })
    );

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
        },
      }
    );

    new NodejsBuild(this, 'WebKendra', {
      assets: [
        {
          path: 'web-kendra',
          exclude: ['build', 'node_modules'],
        },
      ],
      destinationBucket: s3BucketInterface,
      distribution: cloudFrontWebDistribution,
      outputSourceDirectory: 'build',
      buildCommands: ['npm ci', 'npm run build'],
      buildEnvironment: {
        REACT_APP_API_ENDPOINT: `${kendraApi.url}kendra`,
        REACT_APP_IDENTITY_POOL_ID: identityPool.identityPoolId,
        REACT_APP_REGION: this.region,
      },
    });

    // -----
    // Stack の出力を定義
    // -----

    new cdk.CfnOutput(this, 'DataSourceBucketName', {
      value: dataSourceBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'FaqBucketName', {
      value: faqBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'KendraIndexId', {
      value: index.ref,
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: identityPool.identityPoolId,
    });

    new cdk.CfnOutput(this, 'KendraSampleFrontend', {
      value: `https://${cloudFrontWebDistribution.distributionDomainName}`,
    });

    this.index = index;
  }
}
