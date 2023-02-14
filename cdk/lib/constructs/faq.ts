import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CreateFaqCommandInput } from '@aws-sdk/client-kendra';

const UUID = 'A570DE89-B172-47D2-B249-3F0E65C6D971';

export interface FaqProps extends CreateFaqCommandInput {}

export class Faq extends Construct {
  public readonly resource: cdk.CustomResource;

  constructor(scope: Construct, id: string, props: FaqProps) {
    super(scope, id);

    const customResourceHandler = new lambda.SingletonFunction(
      this,
      'CustomResourceFaqHandler',
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        code: lambda.Code.fromAsset('custom-resources'),
        handler: 'faq.handler',
        uuid: UUID,
        lambdaPurpose: 'CustomResourceFaq',
        timeout: cdk.Duration.minutes(15),
      }
    );

    customResourceHandler.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['kendra:CreateFaq', 'kendra:DeleteFaq', 'iam:PassRole'],
      })
    );

    this.resource = new cdk.CustomResource(this, `CustomResourceFaq${id}`, {
      serviceToken: customResourceHandler.functionArn,
      resourceType: 'Custom::Faq',
      properties: props,
    });
  }
}
