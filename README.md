# Simple Lex Kendra JP

> The project is optimized for Japanese.

日本語に最適化されたシンプルな Amazon Lex v2 と Amazon Kendra のサンプルプロジェクトです。AWS CDK で構成されているため、シンプルにデプロイ可能です。Amazon Lex v2 と Amazon Kendra のプロジェクトは基本的には独立していますが、Amazon Lex v2 のプロジェクトから Amazon Kendra を参照しているため、Amazon Lex v2 のプロジェクトをデプロイすると、Amazon Kendra のプロジェクトもデプロイされます。

Amazon Kendra のプロジェクトでは AWS の生成系 AI サービスである Amazon Bedrock と連携することにより、チャット形式でドキュメントを検索することも可能です。 Retrieval Augmented Generation (以降、RAG) という手法を使うことにより、Amazon Kendra で検索したドキュメントを元に、生成系 AI が回答を作成してくれます。  

**Amazon Lex v2 のサンプルプロジェクト**
![lexv2](/imgs/lexv2.png)

**Amazon Kendra のサンプルプロジェクト**
![kendra](/imgs/kendra.png)

**Amazon Kendra (RAG) のサンプルプロジェクト**
![kendra rag](/imgs/kendra-rag.png)

## このアセットでできること

このアセットには、Amazon Kendra の基本的な機能と生成系 AI を用いたチャットを試すことのできる `SimpleKendraStack` と、それに認証とアクセスコントロール機能が加わった `SimpleKendraAuthStack` があります。  
`SimpleLexV2Stack` では、**あらかじめ定義した問い合わせフロー**に応答するチャットボットを試すことができます。

## Architecture

![architecture](/imgs/arch.drawio.png)

## 生成系 AI と Amazon Kendra

生成系 AI は革新的な技術であり、ビジネスに変革をもたらす可能性があります。Amazon Kendra と組み合わせることにより、効果的な情報アクセスを実現できます。本アセットでは、RAG 手法を用いたチャット形式のドキュメント検索のサンプルが含まれています。  
詳細は、[こちらのページ](./docs/07_GEN_AI_KENDRA.md)をご覧ください。

## Step-by-Step Guide for Deployment
- [1. 前提条件の確認](/docs/01_PRE_REQUIREMENT.md)
- [2. AWS CDK のセットアップ](/docs/02_SETUP_CDK.md)
- [3. Amazon Kendra プロジェクトのデプロイ](/docs/03_DEPLOY_KENDRA.md)
- [4. Amazon Lex v2 プロジェクトのデプロイ](/docs/04_DEPLOY_LEXV2.md)
- [5. (任意) Amazon Kendra Auth プロジェクトのデプロイ](/docs/05_DEPLOY_KENDRA_AUTH.md)
- [6. Tech Knowledge](/docs/06_TECH_KNOWLEDGE.md)

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
