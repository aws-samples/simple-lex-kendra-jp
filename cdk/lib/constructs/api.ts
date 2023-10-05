import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as agw from 'aws-cdk-lib/aws-apigateway';
import * as waf from 'aws-cdk-lib/aws-wafv2';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as kendra from 'aws-cdk-lib/aws-kendra';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { CommonWebAcl } from './common-web-acl';

export interface ApiProps {
  userPool: cognito.UserPool;
  index: kendra.CfnIndex;
}

export class Api extends Construct {
  public readonly api: agw.RestApi;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    const queryFunc = new lambda.NodejsFunction(this, 'QueryFunc', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/query.ts',
      timeout: cdk.Duration.minutes(3),
      environment: {
        INDEX_ID: props.index.ref,
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
        resources: [cdk.Token.asString(props.index.getAtt('Arn'))],
        actions: ['kendra:Query'],
      })
    );

    const apiLogGroup = new logs.LogGroup(this, 'KendraApiLog');

    const api = new agw.RestApi(this, 'KendraApi', {
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

    api.addGatewayResponse('KendraApi4xx', {
      type: agw.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Credentials': "'true'",
      },
    });

    api.addGatewayResponse('KendraApi5xx', {
      type: agw.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Credentials': "'true'",
      },
    });

    // API Gateway を Cognito オーソライザーを使って認証する
    const authorizer = new agw.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [props.userPool],
    });

    const kendraEndpoint = api.root.addResource('kendra');
    kendraEndpoint.addMethod('POST', new agw.LambdaIntegration(queryFunc), {
      authorizationType: agw.AuthorizationType.COGNITO,
      authorizer,
    });

    const apiWebAcl = new CommonWebAcl(this, 'KendraApiWebAcl', {
      scope: 'REGIONAL',
    });

    const apiId = api.restApiId;
    const stageName = api.deploymentStage.stageName;
    const region = cdk.Stack.of(this).region;
    const restApiArn = `arn:aws:apigateway:${region}::/restapis/${apiId}/stages/${stageName}`;

    new waf.CfnWebACLAssociation(this, 'KendraApiWebAclAssociation', {
      resourceArn: restApiArn,
      webAclArn: apiWebAcl.webAcl.attrArn,
    });

    this.api = api;
  }
}
