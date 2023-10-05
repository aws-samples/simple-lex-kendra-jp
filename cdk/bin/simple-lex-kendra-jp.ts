#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SimpleKendraStack } from '../lib/simple-kendra-stack';
import { SimpleLexV2Stack } from '../lib/simple-lexv2-stack';
import { WebAclStack } from '../lib/web-acl-stack';
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import { Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';

process.env.overrideWarningsEnabled = 'false';

const fetchLatestBotVersion = async (): Promise<number> => {
  try {
    const stack = await new CloudFormationClient({}).send(
      new DescribeStacksCommand({
        StackName: 'SimpleLexV2Stack',
      })
    );

    const outputs = stack.Stacks?.[0].Outputs;

    if (outputs) {
      return Number(
        outputs.find((o) => o.OutputKey === 'BotVersionNumber')?.OutputValue ||
          '0'
      );
    } else {
      return 0;
    }
  } catch (_) {
    return 0;
  }
};

const app = new cdk.App();

Aspects.of(app).add(new AwsSolutionsChecks());

(async () => {
  const webAclStack = new WebAclStack(app, 'webAcl', {
    crossRegionReferences: true,
    env: {
      region: 'us-east-1',
    },
  });

  const kendraStack = new SimpleKendraStack(
    app,
    'SimpleKendraStack',
    {
      webAclCloudFront: webAclStack.webAcl,
      crossRegionReferences: true,
      env: {
        region: 'ap-northeast-1',
      },
    }
  );

  kendraStack.addDependency(webAclStack);

  const lexStack = new SimpleLexV2Stack(app, 'SimpleLexV2Stack', {
    kendraIndex: kendraStack.index,
    latestBotVersion: await fetchLatestBotVersion(),
    autoIncrementBotVersion: true,
    webAclCloudFront: webAclStack.webAcl,
    crossRegionReferences: true,
    env: {
      region: 'ap-northeast-1',
    },
  });

  lexStack.addDependency(webAclStack);
})();
