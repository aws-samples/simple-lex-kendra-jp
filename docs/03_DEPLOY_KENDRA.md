# Amazon Kendra プロジェクトのデプロイ

> コマンドはルートディレクトリ [/simple-lex-kendra-jp](/) で実行してください。

## セルフサインアップの設定

セルフサインアップとは、ログイン画面からそのままアカウントを作成できる機能（受信可能なメールアドレスが必要）のことです。

[cdk.json](../cdk/cdk.json) の `selfSignUpEnabled` に `true`（セルフサインアップ有効化）か `false`（セルフサインアップ無効化）を設定してください。**デフォルトではセルフサインアップを有効化しています。IP アドレス制限を行っていない場合は、URL を知っていれば誰でもログイン可能な状態になりますので、ご注意ください。**

```json
  "context": {
    "selfSignUpEnabled": true, // <= true / false を設定する
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
    "@aws-cdk/core:checkSecretUsage": true,
```


## デプロイメント

以下のコマンドを実行してください。途中でセキュリティに関連した変更について確認が求められますので、`y` を入力して Enter キーを押下してください。確認をスキップしたい場合は、デプロイコマンドに `--require-approval never` オプションを追加してください。(これに続くドキュメントでは、以下のコマンドを単に `cdk deploy SimpleKendraStack` と記述しています。)

```bash
npm exec -w cdk -- cdk deploy SimpleKendraStack
```

以下のような出力であれば成功です。`SimpleKendraStack.KendraSampleFrontend` にサンプルの URL が表示されていますが、アクセスする前に、以下のデータ取り込みを実施してください。

```
SimpleKendraStack.ApiKendraApiEndpoint5BE9D63F = ...
SimpleKendraStack.CognitoUserPoolClientId = ...
SimpleKendraStack.CognitoUserPoolId = ...
SimpleKendraStack.DataSourceBucketName = ...
SimpleKendraStack.ExportsOutputFnGetAttKendraIndex8794BFDFArnAB03A93F = ...
SimpleKendraStack.ExportsOutputRefKendraIndex8794BFDF99DDBD96 = ...
SimpleKendraStack.IdentityPoolId = ...
SimpleKendraStack.KendraIndexId = ...
SimpleKendraStack.KendraSampleFrontend = ...
```

## データの取り込み

サンプルのサイトを開く前に、データの取り込みを手動で行います。

[Amazon Kendra](https://console.aws.amazon.com/kendra/home) を開き、simple-index-by-cdk を選択して、左カラムの Data sources から s3-data-source をクリックします。右上の Sync now をクリックして、同期を実施してください。

## ユーザ登録

本プロジェクトは認証を行う必要がありますので、ユーザ登録を行います。
管理者と一般ユーザで Kendra の検索結果が異なることを確認したいため、管理者と一般ユーザそれぞれのユーザ登録を行います。

[Amazon Cognito](https://console.aws.amazon.com/cognito/home) を開き、`KendraUserPool` から始まるユーザプールを選択してユーザプールの画面を開き、「ユーザ」の欄にある「ユーザを作成」ボタンを押してください。
「ユーザを作成」画面が開きますので、以下の条件で管理者と一般ユーザの**合計 2 ユーザ**を登録してください。

- 招待メッセージ：「招待を送信しない」を選択
- E メールアドレス：任意のメールアドレスを入力（管理者と一般ユーザで異なるメールアドレスを入力してください。存在しないアドレスで良いです。）
- E メールアドレスを検証済みとしてマークする：チェックする
- 電話番号：入力しない
- 仮パスワード：「パスワードの設定」を選択
- パスワード：任意のパスワードを入力（初回サインインで利用します）

ユーザ登録が完了したら、ユーザグループの登録を行いユーザを管理者権限にします。
後の手順で一般ユーザの動作確認を行うので、当手順は 1 ユーザ分だけ実施してください。

管理者にしたいユーザのユーザ名を選択してユーザ情報の編集画面を開き、「グループメンバーシップ」の欄にある「ユーザーをグループに追加」ボタンを押してください。
「ユーザーをグループに追加」画面が開くと、グループ欄に「KendraAdmin」が表示されていると思いますので、そちらを選択して「追加」をしてください。
「ユーザグループメンバーシップ」欄に、「KendraAdmin」が表示されていれば、管理者となります。

**補足**

上記では、AWS マネージメントコンソールから登録する手順をご紹介しましたが、本プロジェクトはフロントエンドの認証画面を [Amplify UI の Authenticator](https://ui.docs.amplify.aws/react/connected-components/authenticator) で実装しているので、フロントエンドの認証画面からユーザ登録を行うこともできます。
認証画面の「アカウントを作る」から、画面に表示される手順に沿って入力することで、ユーザを登録できます。
ただし、こちらの機能を利用する際は以下についてご注意ください。

- アカウントを登録する過程で、入力したメールアドレスに送信される確認コードを入力する手順がありますので、実際に受信できるメールアドレスしか利用できません。
- ユーザグループに所属しない状態で作成されるので、「一般ユーザ」となります。管理者にしたい場合は、上記の手順通り AWS マネージメントコンソールからユーザグループの登録を行なってください。

## Amazon Bedrock の事前設定

**このリポジトリでは、デフォルトで東京 (ap-northeast-1) リージョンの Anthropic Claude Instanct モデルを利用する設定になっています。[Model access 画面](https://ap-northeast-1.console.aws.amazon.com/bedrock/home?region=ap-northeast-1#/modelaccess) を開き、「Edit」 → 「Anthropic Claude Instant にチェック」 → 「Save changes」 と操作していただいて、東京リージョンにて Amazon Bedrock (基盤モデル: Claude Instant) を利用できる状態にしてください。**


## 動作確認

それでは、サンプルのプロジェクトにアクセスします。デプロイ完了時 AWS CDK が出力した `SimpleKendraStack.KendraSampleFrontend` の URL にアクセスしてください。

ログイン画面が表示されますので、まずは管理者でサインインしてください。
「管理者」と入力して検索を実行してみてください。
すると、「管理者限定」というドキュメントが検索できると思います。

続いて、一般ユーザで確認を行います。右上のメニューからサインアウトして、一般ユーザでサインインしてください。
同様に「管理者」と入力して検索を実行してみてください。
一般ユーザの場合は、「管理者限定」というドキュメントが表示されていないと思います。

上記の文言以外でも検索することが可能ですので、自由に検索をしてみてください。

> - 検索対象は [`/cdk/docs`](/cdk/docs) のテキストファイルです。そちらの内容をクエリのヒントにしてください。

## ドキュメントの追加/変更 (オプショナル 1)

ドキュメントを追加/変更する場合は、[`/cdk/docs`](/cdk/docs) ディレクトリにてドキュメントの追加/変更をし、再度 `cdk deploy SimpleKendraStack` を実行して、手動で DataSource の Sync を実施します。

> - 簡単のため、サンプルのドキュメントとしてとしてテキストファイル (`.txt`) を利用していますが、`.pdf` や `.html` などでも取り込めます。サポートされているファイルのフォーマットは[こちら](https://docs.aws.amazon.com/kendra/latest/dg/index-document-types.html)。

## FAQ の追加/変更 (オプショナル 2)

FAQ を追加/変更する際は、[`/cdk/faq`](/cdk/faq/simple.csv) に内容を追加/変更をします。続いて、[`/cdk/lib/simple-kendra-stack.ts`](/cdk/lib/simple-kendra-stack.ts) の `new Faq(...)` の `Name` を `simple-faq` から `simple-faq2` に変更します。その後、`cdk deploy SimpleKendraStack` を実行します。

FAQ は作成と同時にデータの取り込みが行われ、データソースにアップデートが入っても、内容はアップデートされません。そのため、データソースにアップデートが入った場合、新しくリソースを作り直す必要があります。`Name` を変更することで、内部的に FAQ の削除/作成を行い、内容のアップデートを行っています。

> - 変更後の名前は `simple-faq2` である必要はありません。変更されていれば、なんでも良いです。

## Custom Data Source の追加 (オプショナル 3)

Amazon Kendra は多くの Native connectors を提供しています。([参考: Connectors](https://aws.amazon.com/kendra/connectors/)) しかし、中にはこれらの Connectors 以外のデータソースを利用したい場合もあると思います。その際に利用するのが Custom Data Source です。Custom Data Source にデータを追加する場合は、データのクロール、ドキュメントごとの ID の発行、インデックスしているドキュメントの管理などは独自で実装する必要があります。ここでは、それらは実装済みのものとして、基本的なインデックスへの登録方法のみを実装しています。

データを挿入するための Lambda 関数は CDK でデプロイ済みです。[`/cdk/lambda/sync-custom-data-source.ts`](/cdk/lambda/sync-custom-data-source.ts) の `demoDocuments` という変数にインデックスするデータが定義されています。では、この Lambda 関数を実行します。[Lambda のコンソール](https://console.aws.amazon.com/lambda/home) を開き、SimpleKendraStack-SyncCustomDataSourceFunc... で始まる名前の関数をクリックしてください。ページ中部の Test タブをクリックして、右上の Test を実行してください。この際、パラメータなどは特に見ていないので、デフォルトのままで問題ありません。

実行に成功したら、[Amazon Kendra](https://console.aws.amazon.com/kendra/home) を開き、左カラムの Data sources から custom-data-source をクリックして、Sync run history を確認してください。Indexing... と表示されていればインデックス中で、Succeeded と出れば成功しています。Added の列は 1 になっているはずです。(1 つのドキュメントを追加。)

ではサンプルサイトにアクセスして、追加したドキュメントの内容を検索してみましょう。Kendra についてのドキュメントを追加したので、「Kendra」と検索してみてください。

このように、データさえフェッチできれば、基本的にはどのようなドキュメントでも Kendra に追加できます。この Lambda 関数を定期実行にすれば、自動で Indexing を実行することも可能です。また、今回はデータ形式として PLAIN_TEXT を指定していますが、HTML や PPT、PDF など多くのフォーマットにも対応しています。([参考: Types of documents](https://docs.aws.amazon.com/kendra/latest/dg/index-document-types.html))

## Featured Results を試してみる (オプショナル 4)

[Featured Results (注目の検索結果)](https://docs.aws.amazon.com/ja_jp/kendra/latest/dg/featured-results.html) とは、特定のクエリを実行したときに、特定のドキュメントを検索結果に表示する機能のことです。利用者に注目して欲しいドキュメントをこちらに登録することで、優先して検索結果を表示したり、強調して検索結果を表示することが可能になります。Featured Results として検索されたドキュメントは、通常の検索結果 (ResultItems) には含まれませんので、ご注意ください（重複して検索されません）。

こちらのサンプルコードでは、Featured Results は以下のように表示されます。
![picture 0](../img/../imgs/FeaturedResults.png)

Featured Results は、Amazon Kendra の画面を開き、画面左側の `Featured results` メニューを選択することで登録できます。`Create set` ボタンを押下し、登録画面に進んでください。`Find items to feature` 画面で、Featured Results として表示したいドキュメントを選択してください（AccessControlList を含むメタデータ設定もそのまま引き継がれます）。`Add queries` 画面で登録したクエリが実行されると、Featured Results としてドキュメントが検索されます。

Featured Results は即時反映されるので、ご自身で登録したクエリを実行して確認してみてください。

## カスタム属性を利用したフィルタリングを試してみる (オプショナル 5)

Kendra には[カスタム属性を設定する機能](https://docs.aws.amazon.com/ja_jp/kendra/latest/dg/custom-attributes.html)があり、検索をより便利にできます。

カスタム属性では、以下のことを実現できます。

- 属性によるフィルタリング（Facetable）
- キーワード検索（Searchable）
  - カスタム属性でキーワード検索が可能になります。
  - FAQ では利用不可
- カスタム属性の表示（Displayable）
  - カスタム属性がレスポンスに付与されるので、カスタム属性による画面の制御が可能になります。
- 属性によるソート（Sortable）

カスタム属性の設定は、メタデータ・API・CDK のいずれかで行うことが可能です。当サンプルコードでは、[S3 ドキュメントのメタデータ](https://docs.aws.amazon.com/ja_jp/kendra/latest/dg/s3-metadata.html)および[カスタム CSV](https://docs.aws.amazon.com/ja_jp/kendra/latest/dg/in-creating-faq.html) でカスタム属性を設定しています。サンプルコードには含まれていませんが、[CreateDataSource の CustomDocumentEnrichmentConfiguration](https://docs.aws.amazon.com/ja_jp/kendra/latest/dg/API_CreateDataSource.html) と [BatchPutDocument の Attributes](https://docs.aws.amazon.com/ja_jp/kendra/latest/dg/API_BatchPutDocument.html) でも設定することが可能です。

カスタム属性を利用するためには、ドキュメントに対するカスタム属性の設定とは別に、Index にカスタム属性の設定を行う必要があります。[`/cdk/lib/simple-kendra-stack.ts`](/cdk/lib/simple-kendra-stack.ts) を開き、`// カスタム属性の実装例` 以下でコメントアウトされているコードをアンコメントしてください。その後、デプロイコマンドを実行して Amazon Kendra の画面を開き、Facet definition に Tags という属性が設定されたことを確認してください。

**Index に一度カスタム属性を追加すると、削除することはできません。ご注意ください。ただし、Facetable・Searchable・Displayable・Sortable をすべて false にすることで無効化することは可能です。**

当サンプルコードでは、カスタム属性の Facetable を true にすると、以下のように画面上でフィルタリングを行うことができます。

![picture 1](../imgs/facet.png)

## 手元で Frontend を動かす (オプショナル 6)

手元の PC で Frontend アプリを実行します。Backend をデプロイしておく必要があるため、CDK のデプロイは完了していることを想定しています。以下のコマンドを実行してください。

```bash
export REACT_APP_API_ENDPOINT=<Kendra API Endpoint>
export REACT_APP_IDENTITY_POOL_ID=<Identity Pool ID>
export REACT_APP_REGION=<Region>
export REACT_APP_USER_POOL_ID=<Cognito User Pool ID>
export REACT_APP_USER_POOL_CLIENT_ID=<Cognito User Pool Client ID>
export REACT_APP_PREDICT_STREAM_FUNCTION_ARN=<Predict Stream Function ARN>
```

- 上記 `<...>` の値は `cdk deploy SimpleKendraStack` の出力を確認して適切な値に書き換えてください。
  - `<Kendra API Endpoint>` は `SimpleKendraStack.KendraApiEndpointxxxx = ...` の形式で出力された Endpoint に `kendra` の path を追加したものを設定。最終的に https://xxxxxxxxxx.execute-api.region.amazonaws.com/prod/kendra のような値になる。
  - `<Identity Pool ID>` は `SimpleKendraStack.IdentityPoolId = ...` の値
  - `<Region>` は CDK でデプロイしたリージョン (例: ap-northeast-1)
  - `<Cognito User Pool ID>` は `SimpleKendraStack.CognitoUserPoolId = ...` の値
  - `<Cognito User Pool Client ID>` は `SimpleKendraStack.CognitoUserPoolClientId = ...` の値
  -   - `<Predict Stream Function ARN>` は `SimpleKendraStack.PredictStreamFunctionArn = ...` の値 (Streaming Response を行う Lambda 関数の ARN)
- `cdk deploy SimpleKendraStack` の出力が確認できない場合は、再度デプロイコマンドを実行して出力を確認するか、[CloudFormation](https://console.aws.amazon.com/cloudformation) の SimpleKendraStack から Outputs タブで確認してください。

続いて、3000 番ポートで待ち受けを開始します。

```bash
npm run start -w web-kendra
```

自動でブラウザが開いて、Frontend にアクセスできると思います。

## リソースの削除

SimpleKendraStack を削除する場合は、以下のコマンドを実行してください。
ただし、SimpleKendraStack は後述の手順でも利用するので、Amazon Lex v2 のサンプルもデプロイする場合は、その後に削除することを推奨します。

```bash
npm exec -w cdk -- cdk destroy SimpleKendraStack
```

> S3 Bucket 削除時に書き込みが入り、削除に失敗する場合があります。その場合は、[CloudFormation](https://console.aws.amazon.com/cloudformation) にて対象の Bucket を削除対象から外して Stack を削除し、Bucket は別途手動で削除してください。

## Next Step

[Amazon Lex v2 プロジェクトのデプロイ](/docs/04_DEPLOY_LEXV2.md)
