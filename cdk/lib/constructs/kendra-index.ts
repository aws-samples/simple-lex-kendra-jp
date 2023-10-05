import { Construct } from 'constructs';
import * as kendra from 'aws-cdk-lib/aws-kendra';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export interface KendraIndexProps {
  userPool: cognito.UserPool;
}

export class KendraIndex extends Construct {
  public readonly index: kendra.CfnIndex;

  constructor(scope: Construct, id: string, props: KendraIndexProps) {
    super(scope, id);

    // Index 用の IAM Role を作成
    const indexRole = new iam.Role(this, 'KendraIndexRole', {
      assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
    });

    indexRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['s3:GetObject'],
      })
    );

    indexRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess')
    );

    const index = new kendra.CfnIndex(this, 'KendraIndex', {
      name: 'simple-index-by-cdk',
      edition: 'DEVELOPER_EDITION',
      roleArn: indexRole.roleArn,

      // カスタム属性の実装例
      // "Tags" というカスタム属性を有効化しています。
      // 一度作成したカスタム属性は削除できないので、注意してください。
      // search のオプションを全て false にすることで無効化することは可能です。
      documentMetadataConfigurations: [
        {
          name: 'Tags',
          type: 'STRING_LIST_VALUE',
          search: {
            facetable: true,
            displayable: true,
            searchable: true,
          },
        },
      ],

      // トークンベースのアクセス制御を実施
      // 参考: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-kendra-index.html#cfn-kendra-index-usercontextpolicy
      userContextPolicy: 'USER_TOKEN',

      // 認可に利用する Cognito の情報を設定
      userTokenConfigurations: [
        {
          jwtTokenTypeConfiguration: {
            keyLocation: 'URL',
            userNameAttributeField: 'cognito:username',
            groupAttributeField: 'cognito:groups',
            url: `${props.userPool.userPoolProviderUrl}/.well-known/jwks.json`,
          },
        },
      ],
    });

    this.index = index;
  }
}
