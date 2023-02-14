# Tech Knowledge

特に日本のユーザー向けに Amazon Lex v2 と Amazon Kendra の Tech Knowledge を集約します。最新の情報とずれが生じる可能性があるため、必ず公式の AWS ドキュメントの情報と合わせてご覧ください。

## Amazon Lex v2

### 音声入力について

このサンプルプロジェクトでは音声入力に Amazon Transcribe を利用しています。AWS SDK for JavaScript V3 でサポートされていないためです。AWS SDK for JavaScript V2 ではサポートされています。([サンプル実装](https://github.com/aws-samples/aws-lex-web-ui)) ただし、AWS SDK for JavaScript V2 は 2023 年中にメンテナンスモードに移行することが予定されているため、新規の利用の際には注意が必要です。

- [音声入力サポート状況](https://docs.aws.amazon.com/ja_jp/lexv2/latest/dg/API_runtime_StartConversation.html)
- [JavaScript v2](https://github.com/aws/aws-sdk-js)

### AMAZON.KendraSearchIntent について

Amazon Lex v2 では `AMAZON.KendraSearchIntent` を利用することで、Amazon Kendra による検索を組み込むことが可能です。ただし、現状 (2022/12) ではロケール=英語のみの対応なので、日本語では利用できません。そこで、このサンプルプロジェクトでは、FallbackIntent が呼び出された際に Amazon Kendra で検索するように実装しています。

- [AMAZON.KendraSearchIntent](https://docs.aws.amazon.com/ja_jp/lexv2/latest/dg/built-in-intent-kendra-search.html)

## Amazon Kendra

### Identity Pool の Unauthenticated User に関して

前述した Amazon Lex v2 と Amazon Transcribe にアクセスする際には、Cognito の Identity Pool の Unauthenticated User (ゲストユーザー) で認証しています。一方、Amazon Kendra は Unauthenticated User ではアクセスできません。([Identity Pool の Unauthenticated User からアクセスできる AWS サービスに制限があるため](https://docs.aws.amazon.com/cognito/latest/developerguide/iam-roles.html#access-policies)) そこで、このサンプルプロジェクトでは Amazon API Gateway と AWS Lambda で API を作成しています。

> [この件について解説したブログ](https://prototyping-blog.com/blog/identity-pool-unauth)

### AWS CDK (AWS CloudFormation) でデフォルト言語を指定できない件について

現状は CloudFormation で DataSource と FAQ 作成の際は、デフォルトの言語を指定することができません。日本人のユーザーにとっては、ほとんどの場合、言語を日本語に指定する必要があると思うので、このままではとても不便です。

- [AWS::Kendra::DataSource](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-kendra-datasource.html)
- [AWS::Kendra::Faq](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-kendra-faq.html)

そこで、simple-lex-kendra-jp では、Custom Resource を作成しています。([`/cdk/custom-resources`](/cdk/custom-resources))

### Amazon Kendra で日本語検索する際の Tips

2022/11/27 に Amazon Kendra のセマンティック検索が日本語をサポートしました。日本語で検索する場合は、**分かち書き**をすることで、より正確な答えが得られる場合があります。

- **前: 「2022年のワールドカップ優勝国はどこですか」**
- **後: 「2022年 ワールドカップ 優勝国 どこ」**

このサンプルプロジェクトでは、検索結果が見つからなかった際に、ヒントとして分かち書きを提案するようにしています。

- [Amazon Kendra がセマンティック検索の言語サポートを拡張](https://aws.amazon.com/jp/about-aws/whats-new/2022/11/amazon-kendra-expanded-language-support-semantic/)

### 開発中に集めた Tips

[こちらのブログ](https://prototyping-blog.com/blog/lex-kendra-dev)に開発中に集めた Tips をまとめています。
