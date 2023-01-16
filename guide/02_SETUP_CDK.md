# AWS CDK のセットアップ

まずは、このリポジトリを `git clone` して、npm パッケージのインストールを行います。ターミナルにて、以下のコマンドを実行してください。

```bash
git clone https://github.com/aws-samples/simple-lex-kendra-jp
cd simple-lex-kendra-jp
npm install
```

## AWS CDK の Bootstrap

AWS CDK を利用したことがないリージョンを使う場合は、1 度だけ [Bootstrap](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html) という作業が必要です。Bootstrap には Docker あるいは esbuild というツールが手元に必要です。インストール方法はそれぞれこちらから ([Docker](https://docs.docker.com/desktop/)、[esbuild](https://esbuild.github.io/getting-started/))。このプロジェクトは、`us-east-1` にデプロイされます。よって `us-east-1` で AWS CDK を利用したことがない場合は、以下のコマンドを実行してください。

```bash
npx cdk bootstrap aws://<Account ID>/us-east-1
```

なお、`<Account ID>` は適当な値に置き換えてください。[AWS マネージメントコンソール](https://console.aws.amazon.com)にログインして、右上のアカウント名をクリックした際に表示される 12 桁の数字になります。

> - 2022/12 現在、Amazon Kendra が 東京リージョンでサポートされていないため、全てのリソースを us-east-1 にデプロイします

## Next Step

[Amazon Kendra プロジェクトのデプロイ](/guide/03_DEPLOY_KENDRA.md)
