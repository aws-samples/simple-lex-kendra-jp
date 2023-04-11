import { Construct } from 'constructs';
import * as waf from 'aws-cdk-lib/aws-wafv2';

export interface CommonWebAclProps {
  scope: 'REGIONAL' | 'CLOUDFRONT';
}

export class CommonWebAcl extends Construct {
  public readonly webAcl: waf.CfnWebACL;

  constructor(scope: Construct, id: string, props: CommonWebAclProps) {
    super(scope, id);

    const wafIPSet = new waf.CfnIPSet(this, `IPSet${id}`, {
      name: `IpSet${id}`,
      ipAddressVersion: 'IPV4',
      scope: props.scope,
      addresses: ['0.0.0.0/1', '128.0.0.0/1'],
    });

    const webAcl = new waf.CfnWebACL(this, `WebAcl${id}`, {
      defaultAction: { block: {} },
      name: `WebAcl${id}`,
      scope: props.scope,
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        sampledRequestsEnabled: true,
        metricName: `WebAcl${id}`,
      },
      rules: [
        {
          priority: 1,
          name: `IpSetRule${id}`,
          action: { allow: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `IpSetRule${id}`,
          },
          statement: {
            ipSetReferenceStatement: {
              arn: wafIPSet.attrArn,
            },
          },
        },
      ],
    });

    this.webAcl = webAcl;
  }
}
