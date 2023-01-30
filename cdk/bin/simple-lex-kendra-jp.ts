#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SimpleKendraStack } from '../lib/simple-kendra-stack';
import { SimpleLexV2Stack } from '../lib/simple-lexv2-stack';

// 2022/12 現在 Kendra は Tokyo Region はサポートされていない
const region = 'us-east-1';
const app = new cdk.App();

const kendraStack = new SimpleKendraStack(app, 'SimpleKendraStack', {
  env: { region },
});

new SimpleLexV2Stack(app, 'SimpleLexV2Stack', {
  kendraIndex: kendraStack.index,
  env: { region },
});
