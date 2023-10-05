import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';

// -----
// Cognito リソースの作成
// -----
export class Auth extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Cognito UserPool を作成（サービスを利用するユーザアカウントのプール）
    const userPool = new cognito.UserPool(this, 'KendraUserPool', {
      advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,
      // フロントエンドからユーザー登録を許可
      selfSignUpEnabled: true,
      // メールアドレスをユーザー ID に設定
      signInAliases: {
        email: true,
        username: false,
      },

      // デモ用のためパスワードポリシーを緩くしています
      // 本番環境ではより厳格なポリシーにすることを推奨
      passwordPolicy: {
        minLength: 6,
        requireLowercase: false,
        requireUppercase: false,
        requireDigits: false,
        requireSymbols: false,
      },

      // 以下は本番環境では非推奨
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ユーザグループの作成
    new cognito.CfnUserPoolGroup(
      this,
      'UserGroupAdmin',
      {
        userPoolId: userPool.userPoolId,
        groupName: 'KendraAdmin',
      }
    );

    // Cognito UserPool を利用する Client を作成（フロントエンド用）
    const userPoolClient = userPool.addClient('UserPoolClient', {
      accessTokenValidity: cdk.Duration.days(1),
      idTokenValidity: cdk.Duration.days(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    this.userPool = userPool;
    this.userPoolClient = userPoolClient;
  }
}
