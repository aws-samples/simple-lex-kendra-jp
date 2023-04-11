import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as waf from 'aws-cdk-lib/aws-wafv2';
import { CommonWebAcl } from './constructs';

export class WebAclStack extends cdk.Stack {
  public readonly webAcl: waf.CfnWebACL;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const webAcl = new CommonWebAcl(this, `WebAcl${id}`, {
      scope: 'CLOUDFRONT',
    });

    this.webAcl = webAcl.webAcl;
  }
}
