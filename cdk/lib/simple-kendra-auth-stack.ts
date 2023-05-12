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
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { GeoRestriction } from 'aws-cdk-lib/aws-cloudfront';
import { NodejsBuild } from 'deploy-time-build';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';
import { DataSource, Faq, CommonWebAcl } from './constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NagSuppressions } from 'cdk-nag';
import path = require('path');

export interface SimpleKendraAuthStackProps extends cdk.StackProps {
  webAclCloudFront: waf.CfnWebACL;
}

/**
 * 認証・認可付きの Kendra スタック
 *   当 Stack は SimpleKendraStack を拡張実装したものになります。
 *   SimpleKendraAuthStack の拡張実装部分については、[Auth 拡張実装]とコメントを書いています。
 */
export class SimpleKendraAuthStack extends cdk.Stack {
  public readonly index: kendra.CfnIndex;

  constructor(scope: Construct, id: string, props: SimpleKendraAuthStackProps) {
    super(scope, id, props);

    // -----
    // [Auth 拡張実装] Cognito リソースの作成
    // -----

    // Cognito UserPool を作成（サービスを利用するユーザアカウントのプール）
    const userPool = new cognito.UserPool(this, 'KendraUserPool', {
      advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,
      // ユーザー登録機能を無効化
      selfSignUpEnabled: false,
      // メールアドレスをユーザー ID に設定
      signInAliases: {
        email: true,
        username: false,
      },
      passwordPolicy: {
        minLength: 8, // 以下、パスワードの必須要件の設定
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },

      // 以下は本番環境では非推奨
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ユーザグループの作成
    const userGroupAdmin = new cognito.CfnUserPoolGroup(
      this,
      'UserGroupAdmin',
      {
        userPoolId: userPool.userPoolId,
        groupName: 'KendraAdmin',
      }
    );

    // Cognito UserPool を利用する Client を作成（フロントエンド用）
    const userPoolClient = userPool.addClient('UserPoolClient', {
      accessTokenValidity: cdk.Duration.days(1),
      idTokenValidity: cdk.Duration.days(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });

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
      name: 'simple-auth-index-by-cdk',
      edition: 'DEVELOPER_EDITION',
      roleArn: indexRole.roleArn,

      // [Auth 拡張実装] トークンベースのアクセス制御を実施
      // 参考: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-kendra-index.html#cfn-kendra-index-usercontextpolicy
      userContextPolicy: 'USER_TOKEN',

      // [Auth 拡張実装] 認可に利用する Cognito の情報を設定
      userTokenConfigurations: [
        {
          jwtTokenTypeConfiguration: {
            keyLocation: 'URL',
            userNameAttributeField: 'cognito:username',
            groupAttributeField: 'cognito:groups',
            url: `${userPool.userPoolProviderUrl}/.well-known/jwks.json`,
          },
        },
      ],
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

    // [Auth 拡張実装] デプロイするまで S3 バケット名がわからないため、プログラムの中で動的に JSON ファイルを生成する
    // S3 バケット名がわかっている場合は、静的な JSON ファイルを用意することで問題ありません
    const s3AclJson = [
      {
        keyPrefix: `s3://${dataSourceBucket.bucketName}/docs/admin-only`,
        aclEntries: [
          {
            Name: 'KendraAdmin',
            Type: 'GROUP',
            Access: 'ALLOW',
          },
        ],
      },
    ];

    // /docs ディレクトリを Bucket にアップロードする
    // [Auth 拡張実装] アクセスコントロール確認のために、管理者しか見れないドキュメントを別途用意しています。
    new s3Deploy.BucketDeployment(this, 'DeployDocs', {
      sources: [
        s3Deploy.Source.asset('./docs-auth'),
        s3Deploy.Source.data('/s3-acl.json', JSON.stringify(s3AclJson)),
      ],
      destinationBucket: dataSourceBucket,
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
          // [Auth 拡張実装] アクセスコントロール用の JSON ファイルを設定
          AccessControlListConfiguration: {
            KeyPath: `s3://${dataSourceBucket.bucketName}/s3-acl.json`,
          },
          // [Auth 拡張実装] アクセスコントロール設定を行ったメタデータを設定（アクセスコントロール以外の用途でも利用可）
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
      FileFormat: 'CSV',
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
      FileFormat: 'CSV',
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
        allowHeaders: [...agw.Cors.DEFAULT_HEADERS, 'X-Kendra-Access-Token'],
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

    const apiWebAcl = new CommonWebAcl(this, 'KendraAuthApiWebAcl', {
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

    new NodejsBuild(this, 'WebKendraAuth', {
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
            'web-kendra',
            'web-kendra-auth/build',
            'web-kendra-auth/node_modules',
          ],
        },
      ],
      destinationBucket: s3BucketInterface,
      distribution: cloudFrontWebDistribution,
      outputSourceDirectory: 'web-kendra-auth/build',
      buildCommands: [
        'npm install -w web-kendra-auth',
        'npm run build -w web-kendra-auth',
      ],
      buildEnvironment: {
        REACT_APP_API_ENDPOINT: `${kendraApi.url}kendra`,
        REACT_APP_IDENTITY_POOL_ID: identityPool.identityPoolId,
        REACT_APP_REGION: this.region,
        // [Auth 拡張実装] Cognito の環境情報を設定
        REACT_APP_USER_POOL_ID: userPool.userPoolId,
        REACT_APP_USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
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

    // [Auth 拡張実装] Cognito の情報を出力
    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: userPool.userPoolId,
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolClientId', {
      value: userPoolClient.userPoolClientId,
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
    ]);
  }
}
