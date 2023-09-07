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

このアセットは、SimpleLexKendra 株式会社という架空の会社のイントラ検索システムを想定しています。[`/cdk/docs`](/cdk/docs) ディレクトリにいくつかのドキュメントを配置しています。また、[`/cdk/faq`](/cdk/faq) ディレクトリには、FAQ が csv 形式で配置されています。

このアセットには 3 つのプロジェクトがあり、それぞれ以下のことを行うことができます。

- Amazon Kendra プロジェクト
  - 検索フォームから直接社内ドキュメントを検索
    - 任意のキーワードで社内ドキュメントを検索できます。
    - カスタム属性による検索結果のフィルタリングが可能です。
    - 「注目の検索結果」の設定することで、任意のドキュメントを強調表示できます。
  - さまざまな Data Source を利用してドキュメントを追加
    - S3 に格納されているドキュメントを追加できます。
    - Web Crawler を使って、Web ページをドキュメントとして追加できます。
    - Custom Datasource を使って、任意のドキュメントを追加できます。
  - RAG 手法を用いたチャット機能
    - Amazon Kendra で検索したドキュメントをもとに、生成系 AI がチャットの応答を行います。
- Amazon Kendra Auth プロジェクト
  - 認証とドキュメントのアクセスコントロール
    - 管理者とそれ以外のユーザで検索できるドキュメントを制御できます。
  - 検索フォームから直接社内ドキュメントを検索
    - 任意のキーワードで社内ドキュメントを検索できます。
    - カスタム属性による検索結果のフィルタリングが可能です。
    - 「注目の検索結果」の設定することで、任意のドキュメントを強調表示できます。
- Amazon Lex v2 プロジェクト
  - Chatbot 形式での問い合わせ
    - **あらかじめ定義した問い合わせフロー**をもとに Chatbot が応答します。
      - 業務フローが決まっている業務を Chatbot 化することを想定しています。
    - 対応方法が不明（定義されていないフロー）の場合は、Amazon Kendra を実行して、社内ドキュメントを検索します。

## Architecture

![architecture](/imgs/arch.drawio.png)

## 生成系 AI と Amazon Kendra

生成系 AI は革新的な技術であり、ビジネスに変革をもたらす可能性があります。Amazon Kendra と組み合わせることにより、効果的な情報アクセスを実現できます。

Amazon Kendra を単体で利用する場合、ユーザーは Amazon Kendra が検索したドキュメントを自身で読んで理解する必要があります。一方、生成系 AI と組み合わせて利用することで、ユーザーの要求に合わせてドキュメントを要約したり、よりわかりやすい文章に置き換えたりして表示することが可能になります。また、Amazon Kendra から検索したドキュメントをもとに、生成系 AI がユーザーの質問に答えることもできます。

### RAG とは

RAG ( Retrieval Augmented Generation )は、情報の検索と文章の生成 (ここでは LLM ( 大規模言語モデル ) を指す ) を組み合わせる手法のことです。Amazon Kendra で関連するドキュメントを検索し、その検索したドキュメントを生成系 AI にコンテキストとして与えることで、Fine-Tuning 無しで社内ドキュメントに対応した文章生成を行うことができます。  
ただし、LLM の入力プロンプトには文字数制限（トークン数の制限）があるため、検索したドキュメントをそのまま設定することができないことが多いでしょう。そのため、ドキュメント内の関連する部分だけを抜粋して、LLM に入力する必要があります。RAG の文章生成の精度を上げるためには、Amazon Kendra のような関連ドキュメントを検索し、かつ関連する部分だけを抜粋してくれる高性能な検索サービスが必要不可欠となります。

### RAG を使うメリット

RAG を使うメリットは、以下の通りです。

- 事前学習していないデータに対応できる
  - 最新のデータや社内ドキュメントなどの、学習していないデータに対しても回答できるようになる
    - 実施のハードルが高い Fine-Tuning をすることなく、これらに対応することが可能
- カスタマイズの容易性
  - Prompt Engineering と呼ばれる入力プロンプトの調整作業で、さまざまなタスクに対応可能
- 大規模データへの対応
  - Amazon Kendra を利用すれば、数百万件のドキュメントから検索することが可能であるため、大量の社内ドキュメントに対応できる LLM の処理を構築することが可能

### 本 RAG アセットの注意点

こちらのアセットは、**Amazon Bedrock の Claude 2 ( 基盤モデル ) に最適化して開発しています。** Claude 2 以外の基盤モデルについては、動作や精度を担保しておりませんので、ご注意ください。

また、現在 ( 2023/9 )は **Amazon Bedrock がプレビュー期間中であるため、利用するためには申請が必要**となります。プレビュー申請が通った後に、お試しください。

### 処理の流れ

このアセットの RAG によるチャット形式のドキュメント検索は、以下の流れで処理を行っています。

![rag-flow](/imgs/rag-flow.drawio.png)

#### 処理の解説

- ユーザの質問入力
  - ユーザの質問が入力されたら、即時ローディング表示を行います。
  - 処理の過程でエラーが発生した場合は、ローディング表示を停止して、エラー表示とリトライボタンが表示されます。
- Retrieve 用 Query 生成のプロンプトを実行
  - RAG で非常に重要となる情報の検索は、Amazon Kendra の [Retrieve API](https://docs.aws.amazon.com/ja_jp/kendra/latest/APIReference/API_Retrieve.html) を利用しますが、以下の理由からこの API で利用する Query を LLM で生成します。
    - Retrieve API の Query が 30 トークンを超えると、自動で切り捨てられて検索されるため。
    - ユーザからの質問文をそのまま Query にするよりも、Query を再編成した方が検索精度が良くなるため。
      - 以下、Query 再編成の例
        - 「Kendra について教えて」という質問の場合は、ユーザは概要を知りたがっているので「Kendraの概要」と再編成する。
        - 「Kendraのメタデータについて教えて」「要約して」「登録方法を教えて」という質問が続いている場合、直近の質問でユーザが聞きたいことは「メタデータの登録方法」となる。「要約して」というような指示はすべて無視し、主語を補完し「Kendraのメタデータの登録方法」と再編成する。
- 関連ドキュメントの検索
  - 上記で生成した Query を利用して、Amazon Kendra の Retrieve API を利用して、関連ドキュメントの抜粋を関連度の高い順に取得します。
- 質問プロンプトを実行
  - 取得した関連ドキュメントをコンテキストとして設定して、ユーザの質問の回答を LLM で生成します。
  - プロンプトで回答の手順と回答のルールを定義し、それに沿った回答を生成するように指示しています。
    - たとえば、「参考ドキュメントにない情報は回答しない」「雑談には応答しない」などのルールを定義しています。
  - 生成する回答が長文になる場合も多いため、UX 向上のために Streaming Response の機能を利用して、生成した回答を段階的に表示します。
- 参考ドキュメント取得のプロンプトを実行
  - LLM が回答を生成する際に参考にしたドキュメントの情報がなければ、ユーザは回答結果の信憑性を判断することができません。そのため、LLM に対して回答の際に参考にしたドキュメントの情報を JSON 形式で生成してもらいます。
  - 生成した JSON 形式のデータ React で処理して、参考ドキュメントとして表示します。

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
