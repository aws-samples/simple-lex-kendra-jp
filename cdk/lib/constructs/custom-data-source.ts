import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as kendra from 'aws-cdk-lib/aws-kendra';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export interface CustomDataSourceProps {
  index: kendra.CfnIndex;
}

export class CustomDataSource extends Construct {
  constructor(scope: Construct, id: string, props: CustomDataSourceProps) {
    super(scope, id);

    const customDataSource = new kendra.CfnDataSource(this, 'CustomDataSource', {
      indexId: props.index.ref,
      type: 'CUSTOM',
      name: 'custom-data-source',
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

    const syncCustomDataSourceFunc = new lambda.NodejsFunction(
      this,
      'SyncCustomDataSourceFunc',
      {
        runtime: Runtime.NODEJS_18_X,
        entry: './lambda/sync-custom-data-source.ts',
        timeout: cdk.Duration.minutes(15),
        environment: {
          INDEX_ID: props.index.ref,
          DATA_SOURCE_ID: cdk.Token.asString(
            customDataSource.ref,
          ),
        },
      }
    );

    syncCustomDataSourceFunc.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [cdk.Token.asString(props.index.getAtt('Arn'))],
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
          `${cdk.Token.asString(
props.index.getAtt('Arn')
)}/data-source/${cdk.Token.asString(
customDataSource.ref
)}`,
        ],
        actions: [
          'kendra:StartDataSourceSyncJob',
          'kendra:StopDataSourceSyncJob',
        ],
      })
    );
  }
}
