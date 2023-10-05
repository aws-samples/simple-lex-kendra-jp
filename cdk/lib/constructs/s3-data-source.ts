import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kendra from 'aws-cdk-lib/aws-kendra';

export interface S3DataSourceProps {
  index: kendra.CfnIndex;
}

export class S3DataSource extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: S3DataSourceProps) {
    super(scope, id);

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

    // デプロイするまで S3 バケット名がわからないため、プログラムの中で動的に JSON ファイルを生成する
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
    // アクセスコントロール確認のために、管理者しか見れないドキュメントを別途用意しています。
    new s3Deploy.BucketDeployment(this, 'DeployDocs', {
      sources: [
        s3Deploy.Source.asset('./docs'),
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
        resources: [cdk.Token.asString(props.index.getAtt('Arn'))],
        actions: ['kendra:BatchPutDocument', 'kendra:BatchDeleteDocument'],
      })
    );

    new kendra.CfnDataSource(this, 'S3DataSource', {
      indexId: props.index.ref,
      type: 'S3',
      name: 's3-data-source',
      roleArn: s3DataSourceRole.roleArn,
      dataSourceConfiguration: {
        s3Configuration: {
          bucketName: dataSourceBucket.bucketName,
          inclusionPrefixes: ['docs'],
          // アクセスコントロール用の JSON ファイルを設定
          accessControlListConfiguration: {
            keyPath: `s3://${dataSourceBucket.bucketName}/s3-acl.json`,
          },
          // アクセスコントロール設定を行ったメタデータを設定（アクセスコントロール以外の用途でも利用可）
          documentsMetadataConfiguration: {
            s3Prefix: 'metadata',
          },
        },
      },
      // ドキュメントを日本語して読み込むための設定
      // TODO: LanguageCode が利用可能になったらそちらに切り替える
      customDocumentEnrichmentConfiguration: {
        inlineConfigurations: [
          {
            target: {
              targetDocumentAttributeKey: '_language_code',
              targetDocumentAttributeValue: {
                stringValue: 'ja',
              },
            },
          },
        ],
      },
    });

    this.bucket = dataSourceBucket;
  }
}
