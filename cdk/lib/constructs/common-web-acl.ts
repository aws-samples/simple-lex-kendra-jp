import { Construct } from 'constructs';
import * as waf from 'aws-cdk-lib/aws-wafv2';

export interface CommonWebAclProps {
  scope: 'REGIONAL' | 'CLOUDFRONT';
}

export class CommonWebAcl extends Construct {
  public readonly webAcl: waf.CfnWebACL;

  constructor(scope: Construct, id: string, props: CommonWebAclProps) {
    super(scope, id);

    const wafIPv4Set = new waf.CfnIPSet(this, `IPv4Set${id}`, {
      name: `IPv4Set${id}`,
      ipAddressVersion: 'IPV4',
      scope: props.scope,
      addresses: ['0.0.0.0/1', '128.0.0.0/1'],
    });

    const wafIPv6Set = new waf.CfnIPSet(this, `IPv6Set${id}`, {
      name: `IPv6Set${id}`,
      ipAddressVersion: 'IPV6',
      scope: props.scope,
      addresses: [
        '0000:0000:0000:0000:0000:0000:0000:0000/1',
        '8000:0000:0000:0000:0000:0000:0000:0000/1',
      ],
    });

    const generateIpSetRule = (
      priority: number,
      name: string,
      ipSetArn: string
    ) => ({
      priority,
      name,
      action: { allow: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: name,
      },
      statement: {
        ipSetReferenceStatement: {
          arn: ipSetArn,
        },
      },
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
        generateIpSetRule(1, `IpV4SetRule${id}`, wafIPv4Set.attrArn),
        generateIpSetRule(2, `IpV6SetRule${id}`, wafIPv6Set.attrArn),
      ],
    });

    this.webAcl = webAcl;
  }
}
