# 前提条件

以降のドキュメントは全て UNIX 環境が前提の構築方法になっています。手元の環境で実行する場合は、`AdministratorAccess` 相当の広い権限を付与してください。(本番環境に干渉しないよう、アカウントを分離するなどの対応をお願いいたします。) また、AWS CDK を利用するため、Node.js の実行環境が必要です。

## AWS Cloud9

手元に UNIX コマンド実行環境がない場合は、AWS Cloud9 を利用することも可能です。AWS Cloud9 の環境を作成する際は、[cloud9-setup-for-prototyping](https://github.com/aws-samples/cloud9-setup-for-prototyping) の利用を推奨します。

## Next Step

[AWS CDK のセットアップ](/guide/02_SETUP_CDK.md)
