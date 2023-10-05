import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as kendra from 'aws-cdk-lib/aws-kendra';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import { FaqCustomResource } from './faq-custom-resource';

export interface FaqProps {
  index: kendra.CfnIndex;
}

export class Faq extends Construct {
  constructor(scope: Construct, id: string, props: FaqProps) {
    super(scope, id);

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

    const simpleFaq = new FaqCustomResource(this, 'SimpleCsvFaq', {
      IndexId: props.index.ref,
      LanguageCode: 'ja',
      FileFormat: 'CSV',
      Name: 'simple-faq',
      RoleArn: faqRole.roleArn,
      S3Path: {
        Bucket: faqBucket.bucketName,
        Key: 'faq/simple.csv',
      },
    });

    const kendraFaq = new FaqCustomResource(this, 'KendraFaq', {
      IndexId: props.index.ref,
      LanguageCode: 'ja',
      FileFormat: 'CSV_WITH_HEADER',
      Name: 'Kendra-faq',
      RoleArn: faqRole.roleArn,
      S3Path: {
        Bucket: faqBucket.bucketName,
        Key: 'faq/Amazon-Kendra.csv',
      },
    });

    const lexFaq = new FaqCustomResource(this, 'LexFaq', {
      IndexId: props.index.ref,
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
  }
}
