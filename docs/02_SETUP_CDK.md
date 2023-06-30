# AWS CDK のセットアップ

> コマンドはルートディレクトリ [/simple-lex-kendra-jp](/) で実行してください。

## AWS CDK の Bootstrap

AWS CDK を利用したことがないリージョンを使う場合は、1 度だけ [Bootstrap](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html) という作業が必要です。Bootstrap には Docker あるいは esbuild というツールが手元に必要です。インストール方法はそれぞれこちらから ([Docker](https://docs.docker.com/desktop/)、[esbuild](https://esbuild.github.io/getting-started/))。

```bash
npm exec -w cdk -- cdk bootstrap
```

本リポジトリは CloudFront の WAF を利用しているため、 `us-east-1` のリージョンにも Bootstrap を行う必要があります（[参考](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-wafv2-webacl.html)）。デフォルトのリージョンが `us-east-1` 以外の場合は、以下の通り `us-east-1` リージョンに対しても Bootstrap を実施してください。

```bash
npm exec -w cdk -- cdk bootstrap --region us-east-1
```

## Next Step

[Amazon Kendra プロジェクトのデプロイ](/docs/03_DEPLOY_KENDRA.md)
