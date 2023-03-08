import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CreateDataSourceCommandInput } from '@aws-sdk/client-kendra';

const UUID = 'A424D16E-1EC4-4510-8556-DF20C7D273F3';

export interface DataSourceProps extends CreateDataSourceCommandInput {}

export class DataSource extends Construct {
  public readonly resource: cdk.CustomResource;

  constructor(scope: Construct, id: string, props: DataSourceProps) {
    super(scope, id);

    const customResourceHandler = new lambda.SingletonFunction(
      this,
      'CustomResourceDataSourceHandler',
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        code: lambda.Code.fromAsset('custom-resources'),
        handler: 'data-source.handler',
        uuid: UUID,
        lambdaPurpose: 'CustomResourceDataSource',
        timeout: cdk.Duration.minutes(15),
      }
    );

    customResourceHandler.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: [
          'kendra:CreateDataSource',
          'kendra:UpdateDataSource',
          'kendra:DeleteDataSource',
          'iam:PassRole',
        ],
      })
    );

    this.resource = new cdk.CustomResource(
      this,
      `CustomResourceDataSource${id}`,
      {
        serviceToken: customResourceHandler.functionArn,
        resourceType: 'Custom::DataSource',
        // https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/1037
        // props の型が勝手に変換されてしまう問題があるため、一旦 json に変換
        properties: {
          props: JSON.stringify(props),
        },
      }
    );
  }
}
