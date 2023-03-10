import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lex from 'aws-cdk-lib/aws-lex';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as idPool from '@aws-cdk/aws-cognito-identitypool-alpha';
import * as kendra from 'aws-cdk-lib/aws-kendra';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { NodejsBuild } from 'deploy-time-build';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export interface SimpleLexV2StackProps extends cdk.StackProps {
  kendraIndex: kendra.CfnIndex;
  latestBotVersion: number;
  autoIncrementBotVersion: boolean;
}

export class SimpleLexV2Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SimpleLexV2StackProps) {
    super(scope, id, props);

    const fulfillmentFunc = new lambda.NodejsFunction(
      this,
      'FulfillmentFunction',
      {
        runtime: Runtime.NODEJS_18_X,
        entry: './lambda/lex-fulfillment.ts',
        timeout: cdk.Duration.minutes(3),
        environment: {
          INDEX_ID: props.kendraIndex.ref,
          REGION: this.region,
        },
      }
    );

    fulfillmentFunc.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['kendra:Query'],
        resources: [cdk.Token.asString(props.kendraIndex.getAtt('Arn'))],
      })
    );

    const botRole = new iam.Role(this, 'BotRole', {
      assumedBy: new iam.ServicePrincipal('lexv2.amazonaws.com'),
    });

    const bot = new lex.CfnBot(this, 'Bot', {
      name: 'SimpleBot',
      roleArn: botRole.roleArn,
      dataPrivacy: {
        ChildDirected: false,
      },
      idleSessionTtlInSeconds: 300,
      autoBuildBotLocales: false,
      botLocales: [
        {
          localeId: 'ja_JP',
          nluConfidenceThreshold: 0.85,
          slotTypes: [
            {
              name: 'PCTypes',
              valueSelectionSetting: {
                resolutionStrategy: 'TOP_RESOLUTION',
              },
              slotTypeValues: [
                {
                  sampleValue: { value: 'Windows' },
                  synonyms: [{ value: '??????????????????' }],
                },
                {
                  sampleValue: { value: 'Mac' },
                  synonyms: [{ value: '?????????' }],
                },
              ],
            },
          ],
          intents: [
            {
              name: 'FallbackIntent',
              description:
                '???????????? Intent ??????????????????????????????Kendra ??????????????????',
              parentIntentSignature: 'AMAZON.FallbackIntent',
              fulfillmentCodeHook: { enabled: true },
              initialResponseSetting: {
                initialResponse: {
                  messageGroupsList: [
                    {
                      message: {
                        plainTextMessage: {
                          value:
                            '??????????????????????????????????????????????????????????????????????????????????????????',
                        },
                      },
                    },
                  ],
                },
              },
            },
            {
              name: 'PCReplacementIntent',
              description: '?????????????????????',
              sampleUtterances: [
                { utterance: 'PC?????????' },
                { utterance: '????????????????????????' },
              ],
              slots: [
                {
                  name: 'PCType',
                  slotTypeName: 'PCTypes',
                  valueElicitationSetting: {
                    slotConstraint: 'Required',
                    promptSpecification: {
                      maxRetries: 3,
                      messageGroupsList: [
                        {
                          message: {
                            plainTextMessage: {
                              value:
                                'PC ???????????????????????????????????????????????? PC ????????????????????????????????? (Mac or Windows)',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  name: 'PickupDate',
                  slotTypeName: 'AMAZON.Date',
                  valueElicitationSetting: {
                    slotConstraint: 'Required',
                    promptSpecification: {
                      maxRetries: 3,
                      messageGroupsList: [
                        {
                          message: {
                            plainTextMessage: {
                              value: '????????? {PCType} ???????????????????????????',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  name: 'PickupTime',
                  slotTypeName: 'AMAZON.Time',
                  valueElicitationSetting: {
                    slotConstraint: 'Required',
                    promptSpecification: {
                      maxRetries: 3,
                      messageGroupsList: [
                        {
                          message: {
                            plainTextMessage: {
                              value:
                                '{PickupDate} ????????????????????? {PCType} ???????????????????????????',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
              slotPriorities: [
                { priority: 1, slotName: 'PCType' },
                { priority: 2, slotName: 'PickupDate' },
                { priority: 3, slotName: 'PickupTime' },
              ],
              intentConfirmationSetting: {
                promptSpecification: {
                  maxRetries: 3,
                  messageGroupsList: [
                    {
                      message: {
                        plainTextMessage: {
                          value:
                            '{PCType} ??? {PickupDate} ??? {PickupTime} ??????????????????????????????????????????????????????????????????',
                        },
                      },
                    },
                  ],
                },
                declinationResponse: {
                  messageGroupsList: [
                    {
                      message: {
                        plainTextMessage: {
                          value: '??????????????????????????????????????????',
                        },
                      },
                    },
                  ],
                },
              },
              fulfillmentCodeHook: { enabled: true },
            },
          ],
        },
      ],
    });

    const botVersion =
      props.latestBotVersion + (props.autoIncrementBotVersion ? 1 : 0);
    const latestVersion = new lex.CfnBotVersion(
      this,
      `BotVersion${botVersion}`,
      {
        botId: bot.ref,
        botVersionLocaleSpecification: [
          {
            localeId: 'ja_JP',
            botVersionLocaleDetails: {
              sourceBotVersion: 'DRAFT',
            },
          },
        ],
      }
    );

    const latestAlias = new lex.CfnBotAlias(this, 'LatestAlias', {
      botId: bot.ref,
      botAliasName: 'LatestAlias',
      botVersion: cdk.Token.asString(latestVersion.getAtt('BotVersion')),
      botAliasLocaleSettings: [
        {
          botAliasLocaleSetting: {
            codeHookSpecification: {
              lambdaCodeHook: {
                codeHookInterfaceVersion: '1.0',
                lambdaArn: fulfillmentFunc.functionArn,
              },
            },
            enabled: true,
          },
          localeId: 'ja_JP',
        },
      ],
    });

    fulfillmentFunc.addPermission('AllowLexToInvoke', {
      principal: new iam.ServicePrincipal('lexv2.amazonaws.com'),
      sourceAccount: this.account,
      sourceArn: latestAlias.attrArn,
      action: 'lambda:invokeFunction',
    });

    // -----
    // Identity Pool ?????????
    // -----

    const identityPool = new idPool.IdentityPool(this, 'IdentityPoolForLex', {
      allowUnauthenticatedIdentities: true,
    });

    // Unauthorized User ?????????????????? (Lex, Transcribe, S3) ?????????
    identityPool.unauthenticatedRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'lex:DeleteSession',
          'lex:PutSession',
          'lex:RecognizeText',
          'transcribe:StartStreamTranscriptionWebSocket',
          's3:GetObject',
        ],
        resources: ['*'],
      })
    );

    // -----
    // Frontend ???????????????
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

    new NodejsBuild(this, 'WebLexV2', {
      assets: [
        {
          path: '../',
          exclude: [
            '.git',
            'node_modules',
            'cdk',
            'docs',
            'imgs',
            'web-kendra',
            'web-lexv2/build',
            'web-lexv2/node_modules',
          ],
        },
      ],
      destinationBucket: s3BucketInterface,
      distribution: cloudFrontWebDistribution,
      outputSourceDirectory: 'web-lexv2/build',
      buildCommands: ['npm install -w web-lexv2', 'npm run build -w web-lexv2'],
      buildEnvironment: {
        REACT_APP_BOT_ID: bot.ref,
        REACT_APP_BOT_ALIAS_ID: cdk.Token.asString(
          latestAlias.getAtt('BotAliasId')
        ),
        REACT_APP_IDENTITY_POOL_ID: identityPool.identityPoolId,
        REACT_APP_REGION: this.region,
      },
    });

    // -----
    // Stack ??????????????????
    // -----

    new cdk.CfnOutput(this, 'BotId', {
      value: bot.ref,
    });

    new cdk.CfnOutput(this, 'BotAliasId', {
      value: cdk.Token.asString(latestAlias.getAtt('BotAliasId')),
    });

    new cdk.CfnOutput(this, 'BotVersionNumber', {
      value: botVersion.toString(),
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: identityPool.identityPoolId,
    });

    new cdk.CfnOutput(this, 'LexV2SampleFrontend', {
      value: `https://${cloudFrontWebDistribution.distributionDomainName}`,
    });
  }
}
