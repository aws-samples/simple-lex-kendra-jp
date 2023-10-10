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

現状 (2023/10) は CloudFormation で FAQ を作成する際に、デフォルトの言語を指定することができません。日本人のユーザーにとっては、ほとんどの場合、言語を日本語に指定する必要があると思うので、このままではとても不便です。

- [AWS::Kendra::Faq](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-kendra-faq.html)

そこで、simple-lex-kendra-jp では、Custom Resource を作成しています。([`/cdk/custom-resources`](/cdk/custom-resources))

### ドキュメントのアクセスコントロールについて

現状 (2023/05) 、アクセスコントロール機能は Amazon S3 の Data source connection に限り行うことができます。
※ Amazon S3 以外でアクセスコントロールを実現したい場合は、Index を分けて IAM を使って制御する実装が一つの案として考えられます。

Amazon S3 ドキュメントのアクセスコントロールは、「メタデータ使う方法」と「設定ファイルを使う方法」の2つがあります。
* メタデータを使う方法
  * Amazon S3 ドキュメントにはメタデータを設定することができますが、そのメタデータの一つとして `AccessControlList` があります。
  * `AccessControlList` にアクセス条件を設定することで、ファイルごとにアクセスコントロールを行うことができます。
  * 参考：[Amazon S3 document metadata](https://docs.aws.amazon.com/kendra/latest/dg/s3-metadata.html)
* 設定ファイルを使う方法
  * アクセスコントロール設定用の JSON ファイルを定義することで、一元的にアクセスコントロールを設定することが可能です。
  * フォルダ単位での指定も可能ですので、大量のドキュメントに対してアクセスコントロールを行う場合は、こちらの方法が管理しやすいと思います。
  * `keyPrefix` は `s3://` から始まるフルパスを指定する必要があるのでご注意ください。
  * 参考：[Access control for Amazon S3 data sources](https://docs.aws.amazon.com/kendra/latest/dg/s3-acl.html)

アクセスコントロールはユーザ単位とグループ単位で行うことができます。
ユーザとグループの属性は Index の TokenConfiguration で変更することが可能です。
当サンプルでは、ユーザは `cognito:username` 、グループは `cognito:groups` を指定しています。

Amazon Kendra の Query を実行する際に、Amazon Cognito が発行した JWT トークンを設定することにより、アクセスコントロールが実行されます。
※ Cognito のアクセストークンと ID トークンのどちらも利用可能ですが、認証されたユーザの属性（アイデンティティ）を利用することが主な目的ですので、ID トークンを利用する方が適切です。
JWT トークンは、`--user-context` の `Token` に設定をしてください。
参考：[AWS CLI Referense kendra qurey](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/kendra/query.html)

> [アクセスコントロールについて詳細に解説したブログ](https://prototyping-blog.com/blog/kendra-s3-access-control)

### Amazon Kendra で日本語検索する際の Tips

2022/11/27 に Amazon Kendra のセマンティック検索が日本語をサポートしました。日本語で検索する場合は、**分かち書き**をすることで、より正確な答えが得られる場合があります。

- **前: 「2022年のワールドカップ優勝国はどこですか」**
- **後: 「2022年 ワールドカップ 優勝国 どこ」**

このサンプルプロジェクトでは、検索結果が見つからなかった際に、ヒントとして分かち書きを提案するようにしています。

- [Amazon Kendra がセマンティック検索の言語サポートを拡張](https://aws.amazon.com/jp/about-aws/whats-new/2022/11/amazon-kendra-expanded-language-support-semantic/)

### 開発中に集めた Tips

[こちらのブログ](https://prototyping-blog.com/blog/lex-kendra-dev)に開発中に集めた Tips をまとめています。
