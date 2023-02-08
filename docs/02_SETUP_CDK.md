# AWS CDK のセットアップ

> コマンドはルートディレクトリ [/simple-lex-kendra-jp](/) で実行してください。

## AWS CDK の Bootstrap

AWS CDK を利用したことがないリージョンを使う場合は、1 度だけ [Bootstrap](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html) という作業が必要です。Bootstrap には Docker あるいは esbuild というツールが手元に必要です。インストール方法はそれぞれこちらから ([Docker](https://docs.docker.com/desktop/)、[esbuild](https://esbuild.github.io/getting-started/))。

```bash
npm exec -w cdk -- cdk bootstrap
```

## Next Step

[Amazon Kendra プロジェクトのデプロイ](/docs/03_DEPLOY_KENDRA.md)
