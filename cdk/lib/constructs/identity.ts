import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as idPool from '@aws-cdk/aws-cognito-identitypool-alpha';
import * as s3 from 'aws-cdk-lib/aws-s3';

export interface IdentityProps {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  dataSourceBucket: s3.Bucket;
}

// -----
// Identity Pool の作成
// -----
export class Identity extends Construct {
  public readonly identityPool: idPool.IdentityPool;

  constructor(scope: Construct, id: string, props: IdentityProps) {
    super(scope, id);

    // 認証済み Cognito Pool ユーザに対して権限を付与する
    const identityPool = new idPool.IdentityPool(
      this,
      'IdentityPoolForKendra',
      {
        authenticationProviders: {
          userPools: [
            new idPool.UserPoolAuthenticationProvider({
              userPool: props.userPool,
              userPoolClient: props.userPoolClient,
            }),
          ],
        },
      }
    );

    // Authenticated User に以下の権限 (S3) を付与
    identityPool.authenticatedRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject'],
        resources: [props.dataSourceBucket.arnForObjects('*')],
      })
    );

    this.identityPool = identityPool;
  }
}
