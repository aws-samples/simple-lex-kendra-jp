import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as kendra from 'aws-cdk-lib/aws-kendra';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as agw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as idPool from '@aws-cdk/aws-cognito-identitypool-alpha';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as waf from 'aws-cdk-lib/aws-wafv2';
import { GeoRestriction } from 'aws-cdk-lib/aws-cloudfront';
import { NodejsBuild } from 'deploy-time-build';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';
import { DataSource, Faq, CommonWebAcl } from './constructs';
import {
  DockerImageCode,
  DockerImageFunction,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { NagSuppressions } from 'cdk-nag';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';

export interface SimpleKendraStackProps extends cdk.StackProps {
  webAclCloudFront: waf.CfnWebACL;
}

export class SimpleKendraStack extends cdk.Stack {
  public readonly index: kendra.CfnIndex;

  constructor(scope: Construct, id: string, props: SimpleKendraStackProps) {
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
      // カスタム属性の実装例
      //   以下をコメントアウトすることで、"Tags" というカスタム属性を有効化できます。
      //   一度作成したカスタム属性は削除できないので、注意してください。
      //   search のオプションを全て false にすることで無効化することは可能です。
      // documentMetadataConfigurations: [
      //   {
      //     name: 'Tags',
      //     type: 'STRING_LIST_VALUE',
      //     search: {
      //       facetable: true,
      //       displayable: true,
      //       searchable: true,
      //     },
      //   },
      // ],
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
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      serverAccessLogsPrefix: 'logs',
      enforceSSL: true,
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
    const s3DataSource = new DataSource(this, 'DataSourceS3', {
      IndexId: index.ref,
      Type: 'S3',
      LanguageCode: 'ja',
      Name: 's3-data-source',
      RoleArn: s3DataSourceRole.roleArn,
      Configuration: {
        S3Configuration: {
          BucketName: dataSourceBucket.bucketName,
          InclusionPrefixes: ['docs'],
          DocumentsMetadataConfiguration: {
            S3Prefix: 'metadata',
          },
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
    const webCrawlerDataSourceRole = new iam.Role(
      this,
      'WebCrawlerDataSourceRole',
      {
        assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
      }
    );

    webCrawlerDataSourceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [cdk.Token.asString(index.getAtt('Arn'))],
        actions: ['kendra:BatchPutDocument', 'kendra:BatchDeleteDocument'],
      })
    );

    const webCrawlerDataSource = new DataSource(this, 'DataSourceWebCrawler', {
      IndexId: index.ref,
      Type: 'WEBCRAWLER',
      LanguageCode: 'ja',
      Name: 'webcrawler-data-source',
      RoleArn: webCrawlerDataSourceRole.roleArn,
      Configuration: {
        WebCrawlerConfiguration: {
          CrawlDepth: 1,
          Urls: {
            SeedUrlConfiguration: {
              SeedUrls: ['https://ja.wikipedia.org/wiki/Amazon_Web_Services'],
              WebCrawlerMode: 'HOST_ONLY',
            },
          },
        },
      },
    });

    // Kendra の API スロットリングエラーを回避するために
    // 明示的に依存関係を追加 (逐次作成されるように)
    customDataSource.node.addDependency(s3DataSource);
    webCrawlerDataSource.node.addDependency(customDataSource);

    // ---
    // FAQ の作成
    // ---

    const faqBucket = new s3.Bucket(this, 'FaqBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      serverAccessLogsPrefix: 'logs',
      enforceSSL: true,
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

    const simpleFaq = new Faq(this, 'SimpleCsvFaq', {
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

    const kendraFaq = new Faq(this, 'KendraFaq', {
      IndexId: index.ref,
      LanguageCode: 'ja',
      FileFormat: 'CSV_WITH_HEADER',
      Name: 'Kendra-faq',
      RoleArn: faqRole.roleArn,
      S3Path: {
        Bucket: faqBucket.bucketName,
        Key: 'faq/Amazon-Kendra.csv',
      },
    });

    const lexFaq = new Faq(this, 'LexFaq', {
      IndexId: index.ref,
      LanguageCode: 'ja',
      FileFormat: 'CSV_WITH_HEADER',
      Name: 'Lex-faq',
      RoleArn: faqRole.roleArn,
      S3Path: {
        Bucket: faqBucket.bucketName,
        Key: 'faq/Amazon-Lex.csv',
      },
    });

    // Kendra の API スロットリングエラーを回避するために
    // 明示的に依存関係を追加 (逐次作成されるように)
    lexFaq.node.addDependency(kendraFaq);
    kendraFaq.node.addDependency(simpleFaq);

    // ---
    // Kendra 用の API を作成
    // ---

    const queryFunc = new lambda.NodejsFunction(this, 'QueryFunc', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/query.ts',
      timeout: cdk.Duration.minutes(3),
      environment: {
        INDEX_ID: index.ref,
      },
      bundling: {
        // Featured Results に対応している aws-sdk を利用するため、aws-sdk をバンドルする形でビルドする
        // デフォルトだと aws-sdk が ExternalModules として指定されバンドルされず、Lambda デフォルトバージョンの aws-sdk が利用されるようになる
        // https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/lambda-runtimes.html
        externalModules: [],
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

    const retrieveFunc = new lambda.NodejsFunction(this, 'RetrieveFunc', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/retrieve.ts',
      timeout: cdk.Duration.minutes(3),
      environment: {
        INDEX_ID: index.ref,
      },
      bundling: {
        // Featured Results に対応している aws-sdk を利用するため、aws-sdk をバンドルする形でビルドする
        // デフォルトだと aws-sdk が ExternalModules として指定されバンドルされず、Lambda デフォルトバージョンの aws-sdk が利用されるようになる
        // https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/lambda-runtimes.html
        externalModules: [],
      },
    });

    // Lambda から Kendra を呼び出せるように権限を付与
    retrieveFunc.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [cdk.Token.asString(index.getAtt('Arn'))],
        actions: ['kendra:Retrieve'],
      })
    );

    // FIXME: 現状 Bedrock SDK が Python しか存在しないため、推論だけ別構成とする
    const assumeRolePolicy = new iam.PolicyStatement({
      actions: ['sts:AssumeRole'],
      resources: ['arn:aws:iam::936931980683:role/BedrockRole4RP'],
    });
    const bedrockRole = new iam.Role(this, 'BedrockRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });
    bedrockRole.addToPolicy(assumeRolePolicy);

    const predictFunc = new DockerImageFunction(this, 'PredictFunc', {
      code: DockerImageCode.fromImageAsset('./predictor', {
        platform: Platform.LINUX_AMD64,
      }),
      timeout: cdk.Duration.minutes(1),
      role: bedrockRole,
    });
    predictFunc.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['bedrock:*', 'logs:*'],
      })
    );
    predictFunc.role?.grantAssumeRole(
      new iam.ServicePrincipal('bedrock.amazonaws.com')
    );
    // ----------------------------------------

    // ---実験用
    // const predictFunc = new lambda.NodejsFunction(this, 'predictFunc', {
    //   runtime: Runtime.NODEJS_18_X,
    //   entry: './lambda/predict.ts',
    //   timeout: cdk.Duration.minutes(3),
    //   environment: {
    //     INDEX_ID: index.ref,
    //   },
    //   bundling: {
    //     // Featured Results に対応している aws-sdk を利用するため、aws-sdk をバンドルする形でビルドする
    //     // デフォルトだと aws-sdk が ExternalModules として指定されバンドルされず、Lambda デフォルトバージョンの aws-sdk が利用されるようになる
    //     // https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/lambda-runtimes.html
    //     externalModules: [],
    //   },
    // });

    // // Lambda から Kendra を呼び出せるように権限を付与
    // predictFunc.role?.addToPrincipalPolicy(
    //   new iam.PolicyStatement({
    //     effect: iam.Effect.ALLOW,
    //     resources: [cdk.Token.asString(index.getAtt('Arn'))],
    //     actions: ['kendra:Retrieve'],
    //   })
    // );
    // ---実験用終わり

    const syncCustomDataSourceFunc = new lambda.NodejsFunction(
      this,
      'SyncCustomDataSourceFunc',
      {
        runtime: Runtime.NODEJS_18_X,
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
          // cdk.Token.asString(customDataSource.resource.getAtt('Arn')) だと Index ID が undefined になる
          `${cdk.Token.asString(
            index.getAtt('Arn')
          )}/data-source/${cdk.Token.asString(
            customDataSource.resource.getAtt('Id')
          )}`,
        ],
        actions: [
          'kendra:StartDataSourceSyncJob',
          'kendra:StopDataSourceSyncJob',
        ],
      })
    );

    const apiLogGroup = new logs.LogGroup(this, 'KendraApiLog');

    const kendraApi = new agw.RestApi(this, 'KendraApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: agw.Cors.ALL_ORIGINS,
        allowMethods: agw.Cors.ALL_METHODS,
      },
      deployOptions: {
        accessLogDestination: new agw.LogGroupLogDestination(apiLogGroup),
        accessLogFormat: agw.AccessLogFormat.jsonWithStandardFields(),
        loggingLevel: agw.MethodLoggingLevel.INFO,
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

    const ragEndpoint = kendraEndpoint.addResource('rag');
    ragEndpoint.addMethod('POST', new agw.LambdaIntegration(retrieveFunc));

    const predictEndpoint = kendraEndpoint.addResource('predict');
    predictEndpoint.addMethod('POST', new agw.LambdaIntegration(predictFunc));

    const apiWebAcl = new CommonWebAcl(this, 'KendraApiWebAcl', {
      scope: 'REGIONAL',
    });

    const apiId = kendraApi.restApiId;
    const stageName = kendraApi.deploymentStage.stageName;
    const restApiArn = `arn:aws:apigateway:${this.region}::/restapis/${apiId}/stages/${stageName}`;

    new waf.CfnWebACLAssociation(this, 'KendraApiWebAclAssociation', {
      resourceArn: restApiArn,
      webAclArn: apiWebAcl.webAcl.attrArn,
    });

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
          geoRestriction: GeoRestriction.allowlist('JP'),
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
            'web-kendra-auth',
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
    ]);
  }
}
