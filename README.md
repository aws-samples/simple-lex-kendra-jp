# Simple Lex Kendra JP

> The project is optimized for Japanese.

日本語に最適化されたシンプルな Amazon Lex v2 と Amazon Kendra のサンプルプロジェクトです。AWS CDK で構成されているため、シンプルにデプロイ可能です。Amazon Lex v2 と Amazon Kendra のプロジェクトは基本的には独立していますが、Amazon Lex v2 のプロジェクトから Amazon Kendra を参照しているため、Amazon Lex v2 のプロジェクトをデプロイすると、Amazon Kendra のプロジェクトもデプロイされます。

**Amazon Lex v2 のサンプルプロジェクト**
![lexv2](/imgs/lexv2.png)

**Amazon Kendra のサンプルプロジェクト**
![kendra](/imgs/kendra.png)

## シナリオ

SimpleLexKendra 株式会社という架空の会社のイントラ検索システムを想定しています。[`/cdk/docs`](/cdk/docs) ディレクトリにいくつかのドキュメントを配置しています。また、[`/cdk/faq`](/cdk/faq) ディレクトリには、FAQ が csv 形式で配置されています。

「Amazon Lex v2 プロジェクト」では、Chatbot 形式で情報システム部に問い合わせを行います。あらかじめよくある問い合わせのフローを定義しておくことで、情報システム部の負担を軽減しています。また、対応方法が不明な問い合わせ (フローとして定義されていない問い合わせ) の場合は、Amazon Kendra を実行して、社内ドキュメントを検索します。

「Amazon Kendra プロジェクト」では、検索フォームから直接社内ドキュメントを検索できます。認証・認可の機能を実装しており、管理者とそれ以外のユーザで検索できるドキュメントを制御しています。

## Step-by-Step Guide for Deployment
- [1. 前提条件の確認](/docs/01_PRE_REQUIREMENT.md)
- [2. AWS CDK のセットアップ](/docs/02_SETUP_CDK.md)
- [3. Amazon Kendra プロジェクトのデプロイ](/docs/03_DEPLOY_KENDRA.md)
- [4. Amazon Lex v2 プロジェクトのデプロイ](/docs/04_DEPLOY_LEXV2.md)
- [5. (任意) Amazon Kendra Auth プロジェクトのデプロイ](/docs/05_DEPLOY_KENDRA_AUTH.md)
- [6. Tech Knowledge](/docs/06_TECH_KNOWLEDGE.md)

## Architecture

![](/imgs/arch.drawio.png)

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
