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
import { DataSource, Faq } from './constructs';

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
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // /docs ディレクトリを Bucket にアップロードする
    new s3Deploy.BucketDeployment(this, 'DeployDocs', {
      sources: [s3Deploy.Source.asset('./docs')],
      destinationBucket: dataSourceBucket,
      destinationKeyPrefix: 'docs',
    });

    const s3DataSourceRole = new iam.Role(this, 'DataSourceRole', {
      assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
    });

    s3DataSourceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:s3:::${dataSourceBucket.bucketName}`],
        actions: ['s3:ListBucket'],
      })
    );

    s3DataSourceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:s3:::${dataSourceBucket.bucketName}/*`],
        actions: ['s3:GetObject'],
      })
    );

    s3DataSourceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [cdk.Token.asString(index.getAtt('Arn'))],
        actions: ['kendra:BatchPutDocument', 'kendra:BatchDeleteDocument'],
      })
    );

    // S3 Bucket 用の Data Source の作成
    new DataSource(this, 'DataSourceS3', {
      IndexId: index.ref,
      Type: 'S3',
      LanguageCode: 'ja',
      Name: 's3-data-source',
      RoleArn: s3DataSourceRole.roleArn,
      Configuration: {
        S3Configuration: {
          BucketName: dataSourceBucket.bucketName,
          InclusionPrefixes: ['docs'],
        },
      },
    });

    // Custom Data Source 用の Data Source の作成
    const customDataSource = new DataSource(this, 'DataSourceCustom', {
      IndexId: index.ref,
      Type: 'CUSTOM',
      LanguageCode: 'ja',
      Name: 'custom-data-source',
    });

    // Web Crawler の実装例
    /*
    const webCrawlerDataSourceRole = new iam.Role(this, 'WebCrawlerDataSourceRole', {
      assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
    });

    webCrawlerDataSourceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [cdk.Token.asString(index.getAtt('Arn'))],
        actions: ['kendra:BatchPutDocument', 'kendra:BatchDeleteDocument'],
      })
    );

    new DataSource(this, 'DataSourceWebCrawler', {
      IndexId: index.ref,
      Type: 'WEBCRAWLER',
      LanguageCode: 'ja',
      Name: 'webcrawler-data-source',
      RoleArn: webCrawlerDataSourceRole.roleArn,
      Configuration: {
        WebCrawlerConfiguration: {
          // https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/1037
          // props の型が勝手に変換されてしまう問題がある
          // CrawlDepth: 1,
          Urls: {
            SeedUrlConfiguration: {
              SeedUrls: [
                'https://ja.wikipedia.org/wiki/Amazon_Web_Services',
              ],
              WebCrawlerMode: 'HOST_ONLY',
            },
          },
        },
      },
    });
    */

    // ---
    // FAQ の作成
    // ---

    const faqBucket = new s3.Bucket(this, 'FaqBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
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

    new Faq(this, 'SimpleCsvFaq', {
      IndexId: index.ref,
      LanguageCode: 'ja',
      FileFormat: 'CSV',
      Name: 'simple-faq',
      RoleArn: faqRole.roleArn,
      S3Path: {
        Bucket: faqBucket.bucketName,
        Key: 'faq/simple.csv',
      },
    });

    // ---
    // Kendra 用の API を作成
    // ---

    const queryFunc = new lambda.NodejsFunction(this, 'QueryFunc', {
      entry: './lambda/query.ts',
      timeout: cdk.Duration.minutes(3),
      environment: {
        INDEX_ID: index.ref,
      },
    });

    // Lambda から Kendra を呼び出せるように権限を付与
    queryFunc.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [cdk.Token.asString(index.getAtt('Arn'))],
        actions: ['kendra:Query'],
      })
    );

    const syncCustomDataSourceFunc = new lambda.NodejsFunction(
      this,
      'SyncCustomDataSourceFunc',
      {
        entry: './lambda/sync-custom-data-source.ts',
        timeout: cdk.Duration.minutes(15),
        environment: {
          INDEX_ID: index.ref,
          DATA_SOURCE_ID: cdk.Token.asString(
            customDataSource.resource.getAtt('Id')
          ),
        },
      }
    );

    syncCustomDataSourceFunc.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [cdk.Token.asString(index.getAtt('Arn'))],
        actions: [
          'kendra:StartDataSourceSyncJob',
          'kendra:StopDataSourceSyncJob',
          'kendra:BatchPutDocument',
          'kendra:BatchDeleteDocument',
        ],
      })
    );

    syncCustomDataSourceFunc.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [
          cdk.Token.asString(customDataSource.resource.getAtt('Arn')),
        ],
        actions: [
          'kendra:StartDataSourceSyncJob',
          'kendra:StopDataSourceSyncJob',
        ],
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
    kendraEndpoint.addMethod('POST', new agw.LambdaIntegration(queryFunc));

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
          autoDeleteObjects: true,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        },
        loggingBucketProps: {
          autoDeleteObjects: true,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        },
        cloudFrontLoggingBucketProps: {
          autoDeleteObjects: true,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        },
      },
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
