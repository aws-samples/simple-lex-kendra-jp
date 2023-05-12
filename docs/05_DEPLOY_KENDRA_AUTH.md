# Amazon Kendra Auth プロジェクトのデプロイ

> コマンドはルートディレクトリ [/simple-lex-kendra-jp](/) で実行してください。

## 概要
「Amazon Kendra プロジェクト」では、認証無しで利用できる Kendra のシステムをデプロイしました。  
「Amazon Kendra Auth プロジェクト」では、認証・認可の機能を確認することができます。  
認証の機能は、[Amplify UI の Authenticator](https://ui.docs.amplify.aws/react/connected-components/authenticator) を利用して実装しています。  

当プロジェクトは、以下の機能を除き「Amazon Kendra プロジェクト」と同様の機能・実装になります。  
当プロジェクトの独自実装部分については、`[Auth 拡張実装]` というコメントをプログラム中に入れています。  
* ログイン認証
* ドキュメントのアクセス制御（管理者グループのみドキュメントにアクセスできる）

## デプロイメント

以下のコマンドを実行してください。途中でセキュリティに関連した変更について確認が求められますので、`y` を入力して Enter キーを押下してください。確認をスキップしたい場合は、デプロイコマンドに `--require-approval never` オプションを追加してください。(これに続くドキュメントでは、以下のコマンドを単に `cdk deploy SimpleKendraAuthStack` と記述しています。)

```bash
npm exec -w cdk -- cdk deploy SimpleKendraAuthStack
```

以下のような出力であれば成功です。`SimpleKendraAuthStack.KendraSampleFrontend` にサンプルの URL が表示されていますが、アクセスする前に、以下のデータ取り込みとユーザ登録を実施してください。

```
SimpleKendraAuthStack.CognitoUserPoolClientId = ...
SimpleKendraAuthStack.CognitoUserPoolId = ...
SimpleKendraAuthStack.DataSourceBucketName = ...
SimpleKendraAuthStack.ExportsOutputFnGetAttKendraIndexArn7ABEB122 = ...
SimpleKendraAuthStack.ExportsOutputRefKendraIndex7C32BDCD = ...
SimpleKendraAuthStack.IdentityPoolId = ...
SimpleKendraAuthStack.KendraApiEndpointF276F28B = ...
SimpleKendraAuthStack.KendraIndexId = ...
SimpleKendraAuthStack.KendraSampleFrontend = ...
```

## データの取り込み

サンプルのサイトを開く前に、データの取り込みを手動で行います。

[Amazon Kendra](https://console.aws.amazon.com/kendra/home) を開き、simple-auth-index-by-cdk を選択して、左カラムの Data sources から s3-data-source をクリックします。右上の Sync now をクリックして、同期を実施してください。

## ユーザ登録

本プロジェクトは認証を行う必要がありますので、ユーザ登録を行います。  

[Amazon Cognito](https://console.aws.amazon.com/cognito/home) を開き、`KendraUserPool` から始まるユーザプールを選択してユーザプールの画面を開き、「ユーザ」の欄にある「ユーザを作成」ボタンを押してください。  
「ユーザを作成」画面が開きますので、以下の条件で管理者と一般ユーザを登録してください。  
* 招待メッセージ：「招待を送信しない」を選択
* E メールアドレス：任意のメールアドレスを入力（存在しないアドレスでも可）
  * 管理者と一般ユーザで異なるメールアドレスを入力してください。
* E メールアドレスを検証済みとしてマークする：チェックする
* 電話番号：入力しない
* 仮パスワード：「パスワードの設定」を選択
* パスワード：任意のパスワードを入力（初回サインインで利用します）

ユーザ登録が完了したら、ユーザグループの登録を行います。  
管理者にしたいユーザ名を選択してユーザ情報の編集画面を開き、「グループメンバーシップ」の欄にある「ユーザーをグループに追加」ボタンを押してください。  
「ユーザーをグループに追加」画面が開くと、グループ欄に「 KendraAdmin 」が表示されていると思いますので、そちらを選択して「追加」をしてください。  
「ユーザグループメンバーシップ」欄に、「 KendraAdmin 」が表示されていれば、管理者となります。  

## 動作確認
それでは、サンプルのプロジェクトにアクセスします。デプロイ完了時 AWS CDK が出力した `SimpleKendraAuthStack.KendraSampleFrontend` の URL にアクセスしてください。  

ログイン画面が表示されますので、まずは管理者でサインインしてください。  
「管理者」と入力して検索を実行してみてください。  
すると、「管理者限定」というドキュメントが検索できると思います。  

続いて、一般ユーザで確認を行います。右上のメニューからサインアウトして、一般ユーザでサインインしてください。  
同様に「管理者」と入力して検索を実行してみてください。  
一般ユーザの場合は、「管理者限定」というドキュメントが表示されていないと思います。  

上記の文言以外でも検索することが可能ですので、自由に検索をしてみてください。
> - 検索対象は [`/cdk/docs`](/cdk/docs) のテキストファイルです。そちらの内容をクエリのヒントにしてください。

**+++ Attention +++**  
**以降の「オプショナル 1 〜 5」は、「 Amazon Kendra プロジェクト」と同様になりますので、そちらで実施済みの場合は実施不要です。**

## ドキュメントの追加/変更 (オプショナル 1)

ドキュメントを追加/変更する場合は、[`/cdk/docs`](/cdk/docs) ディレクトリにてドキュメントの追加/変更をし、再度 `cdk deploy SimpleKendraStack` を実行して、手動で DataSource の Sync を実施します。

> - 簡単のため、サンプルのドキュメントとしてとしてテキストファイル (`.txt`) を利用していますが、`.pdf` や `.html` などでも取り込めます。サポートされているファイルのフォーマットは[こちら](https://docs.aws.amazon.com/kendra/latest/dg/index-document-types.html)。

## FAQ の追加/変更 (オプショナル 2)

FAQ を追加/変更する際は、[`/cdk/faq`](/cdk/faq/simple.csv) に内容を追加/変更をします。続いて、[`/cdk/lib/simple-kendra-auth-stack.ts`](/cdk/lib/simple-kendra-stack.ts) の `new Faq(...)` の `Name` を `simple-faq` から `simple-faq2` に変更します。その後、`cdk deploy SimpleKendraAuthStack` を実行します。

FAQ は作成と同時にデータの取り込みが行われ、データソースにアップデートが入っても、内容はアップデートされません。そのため、データソースにアップデートが入った場合、新しくリソースを作り直す必要があります。`Name` を変更することで、内部的に FAQ の削除/作成を行い、内容のアップデートを行っています。

> - 変更後の名前は `simple-faq2` である必要はありません。変更されていれば、なんでも良いです。

## Custom Data Source の追加 (オプショナル 3)

Amazon Kendra は多くの Native connectors を提供しています。([参考: Connectors](https://aws.amazon.com/kendra/connectors/)) しかし、中にはこれらの Connectors 以外のデータソースを利用したい場合もあると思います。その際に利用するのが Custom Data Source です。Custom Data Source にデータを追加する場合は、データのクロール、ドキュメントごとの ID の発行、インデックスしているドキュメントの管理などは独自で実装する必要があります。ここでは、それらは実装済みのものとして、基本的なインデックスへの登録方法のみを実装しています。

データを挿入するための Lambda 関数は CDK でデプロイ済みです。[`/cdk/lambda/sync-custom-data-source.ts`](/cdk/lambda/sync-custom-data-source.ts) の `demoDocuments` という変数にインデックスするデータが定義されています。では、この Lambda 関数を実行します。[Lambda のコンソール](https://console.aws.amazon.com/lambda/home) を開き、SimpleKendraStack-SyncCustomDataSourceFunc... で始まる名前の関数をクリックしてください。ページ中部の Test タブをクリックして、右上の Test を実行してください。この際、パラメータなどは特に見ていないので、デフォルトのままで問題ありません。

実行に成功したら、[Amazon Kendra](https://console.aws.amazon.com/kendra/home) を開き、左カラムの Data sources から custom-data-source をクリックして、Sync run history を確認してください。Indexing... と表示されていればインデックス中で、Succeeded と出れば成功しています。Added の列は 1 になっているはずです。(1 つのドキュメントを追加。)

ではサンプルサイトにアクセスして、追加したドキュメントの内容を検索してみましょう。Kendra についてのドキュメントを追加したので、「Kendra」と検索してみてください。

このように、データさえフェッチできれば、基本的にはどのようなドキュメントでも Kendra に追加できます。この Lambda 関数を定期実行にすれば、自動で Indexing を実行することも可能です。また、今回はデータ形式として PLAIN_TEXT を指定していますが、HTML や PPT、PDF など多くのフォーマットにも対応しています。([参考: Types of documents](https://docs.aws.amazon.com/kendra/latest/dg/index-document-types.html))

## Web Crawler の追加 (オプショナル 4)

Web ページをクローリングして、コンテンツを Amazon Kendra の Index に登録します。例として [AWS の Wikipedia](https://ja.wikipedia.org/wiki/Amazon_Web_Services) をクロールします。

なお、Web Crawler についてはデフォルトでデプロイされず、コメントアウトしてあります。[`/cdk/lib/simple-kendra-auth-stack.ts`](/cdk/lib/simple-kendra-auth-stack.ts) を開き、`// Web Crawler の実装例` 以下でコメントアウトされているコードをアンコメントしてください。その後、デプロイコマンドを実行して Amazon Kendra の画面を開き、Data Source に webcrawler-data-source が追加されたことを確認します。最後に右上の Sync now をクリックしてデータを取り込みます。

それらが完了したら、「AWS とは」などで検索を行ってみてください。

## 手元で Frontend を動かす (オプショナル 5)

手元の PC で Frontend アプリを実行します。Backend をデプロイしておく必要があるため、CDK のデプロイは完了していることを想定しています。以下のコマンドを実行してください。

```bash
export REACT_APP_API_ENDPOINT=<Kendra API Endpoint>
export REACT_APP_IDENTITY_POOL_ID=<Identity Pool ID>
export REACT_APP_REGION=<Region>
export REACT_APP_USER_POOL_ID=<Cognito User Pool ID>
export REACT_APP_USER_POOL_CLIENT_ID=<Cognito User Pool Client ID>
```

- 上記 `<...>` の値は `cdk deploy SimpleKendraAuthStack` の出力を確認して適切な値に書き換えてください。
  - `<Kendra API Endpoint>` は `SimpleKendraAuthStack.KendraApiEndpointxxxx = ...` の形式で出力された Endpoint に `kendra` の path を追加したものを設定。最終的に https://xxxxxxxxxx.execute-api.region.amazonaws.com/prod/kendra のような値になる。
  - `<Identity Pool ID>` は `SimpleKendraAuthStack.IdentityPoolId = ...` の値
  - `<Region>` は CDK でデプロイしたリージョン (例: ap-northeast-1)
  - `<Cognito User Pool ID>` は `SimpleKendraAuthStack.CognitoUserPoolId = ...` の値
  - `<Cognito User Pool Client ID>` は `SimpleKendraAuthStack.CognitoUserPoolClientId = ...` の値
- `cdk deploy SimpleKendraAuthStack` の出力が確認できない場合は、再度デプロイコマンドを実行して出力を確認するか、[CloudFormation](https://console.aws.amazon.com/cloudformation) の SimpleKendraAuthStack から Outputs タブで確認してください。

続いて、3000 番ポートで待ち受けを開始します。

```bash
npm run start -w web-kendra-auth
```

自動でブラウザが開いて、Frontend にアクセスできると思います。

## リソースの削除

SimpleKendraAuthStack を削除する場合は、以下のコマンドを実行してください。

```bash
npm exec -w cdk -- cdk destroy SimpleKendraAuthStack
```

> S3 Bucket 削除時に書き込みが入り、削除に失敗する場合があります。その場合は、[CloudFormation](https://console.aws.amazon.com/cloudformation) にて対象の Bucket を削除対象から外して Stack を削除し、Bucket は別途手動で削除してください。

## Next Step

[Tech Knowledge](/docs/06_TECH_KNOWLEDGE.md)
