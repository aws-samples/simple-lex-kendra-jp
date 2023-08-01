# Amazon Kendra Auth プロジェクトのデプロイ

> コマンドはルートディレクトリ [/simple-lex-kendra-jp](/) で実行してください。

## 概要
「Amazon Kendra プロジェクト」では、認証無しで利用できる Kendra のシステムをデプロイしました。  
「Amazon Kendra Auth プロジェクト」では、認証・認可の機能を確認できます。  
認証の機能は、[Amplify UI の Authenticator](https://ui.docs.amplify.aws/react/connected-components/authenticator) を利用して実装しています。  

当プロジェクトは、以下の機能を除き「Amazon Kendra プロジェクト」と同様の機能・実装になります。  
当プロジェクトの独自実装部分については、`[Auth 拡張実装]` というコメントをプログラム中に入れています。  

- ログイン認証
- ドキュメントのアクセス制御（管理者グループのみドキュメントにアクセスできる）

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
管理者と一般ユーザで Kendra の検索結果が異なることを確認したいため、管理者と一般ユーザそれぞれのユーザ登録を行います。  

[Amazon Cognito](https://console.aws.amazon.com/cognito/home) を開き、`KendraUserPool` から始まるユーザプールを選択してユーザプールの画面を開き、「ユーザ」の欄にある「ユーザを作成」ボタンを押してください。  
「ユーザを作成」画面が開きますので、以下の条件で管理者と一般ユーザの**合計 2 ユーザ**を登録してください。  

- 招待メッセージ：「招待を送信しない」を選択
- E メールアドレス：任意のメールアドレスを入力（存在しないアドレスでも可）
  - 管理者と一般ユーザで異なるメールアドレスを入力してください。
- E メールアドレスを検証済みとしてマークする：チェックする
- 電話番号：入力しない
- 仮パスワード：「パスワードの設定」を選択
- パスワード：任意のパスワードを入力（初回サインインで利用します）

ユーザ登録が完了したら、ユーザグループの登録を行いユーザを管理者権限にします。  
後の手順で一般ユーザの動作確認を行うので、当手順は 1 ユーザ分だけ実施してください。  

管理者にしたいユーザのユーザ名を選択してユーザ情報の編集画面を開き、「グループメンバーシップ」の欄にある「ユーザーをグループに追加」ボタンを押してください。  
「ユーザーをグループに追加」画面が開くと、グループ欄に「 KendraAdmin 」が表示されていると思いますので、そちらを選択して「追加」をしてください。  
「ユーザグループメンバーシップ」欄に、「 KendraAdmin 」が表示されていれば、管理者となります。  

**補足**  
上記では、AWS マネージメントコンソールから登録する手順をご紹介しましたが、本プロジェクトはフロントエンドの認証画面を [Amplify UI の Authenticator](https://ui.docs.amplify.aws/react/connected-components/authenticator) で実装しているので、フロントエンドの認証画面からユーザ登録を行うこともできます。  
認証画面の「アカウントを作る」から、画面に表示される手順に沿って入力することで、ユーザを登録できます。  
ただし、こちらの機能を利用する際は以下についてご注意ください。

- アカウントを登録する過程で、入力したメールアドレスに送信される確認コードを入力する手順がありますので、実際に受信できるメールアドレスしか利用できません。
- ユーザグループに所属しない状態で作成されるので、「一般ユーザ」となります。管理者にしたい場合は、上記の手順通り AWS マネージメントコンソールからユーザグループの登録を行なってください。


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

## Featured Results を試してみる (オプショナル 1)

こちらは、「Amazon Kendra プロジェクト」の「Featured Results を試してみる」と同じ内容です。

[Featured Results (注目の検索結果)](https://docs.aws.amazon.com/ja_jp/kendra/latest/dg/featured-results.html) とは、特定のクエリを実行したときに、特定のドキュメントを検索結果に表示する機能のことです。利用者に注目して欲しいドキュメントをこちらに登録することで、優先して検索結果を表示したり、強調して検索結果を表示することが可能になります。Featured Results として検索されたドキュメントは、通常の検索結果 (ResultItems) には含まれませんので、ご注意ください（重複して検索されません）。

こちらのサンプルコードでは、Featured Results は以下のように表示されます。
![picture 0](../img/../imgs/FeaturedResults.png)  

Featured Results は、Amazon Kendra の画面を開き、画面左側の `Featured results` メニューを選択することで登録できます。`Create set` ボタンを押下し、登録画面に進んでください。`Find items to feature` 画面で、Featured Results として表示したいドキュメントを選択してください（AccessControlList を含むメタデータ設定もそのまま引き継がれます）。`Add queries` 画面で登録したクエリが実行されると、Featured Results としてドキュメントが検索されます。

Featured Results は即時反映されるので、ご自身で登録したクエリを実行して確認してみてください。

## カスタム属性を利用したフィルタリングを試してみる (オプショナル 2)

こちらは、「Amazon Kendra プロジェクト」の「カスタム属性を利用したフィルタリングを試してみる」と同じ内容です。

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

カスタム属性を利用するためには、ドキュメントに対するカスタム属性の設定とは別に、Index にカスタム属性の設定を行う必要があります。[`/cdk/lib/simple-kendra-auth-stack.ts`](/cdk/lib/simple-kendra-auth-stack.ts) を開き、`// カスタム属性の実装例` 以下でコメントアウトされているコードをアンコメントしてください。その後、デプロイコマンドを実行して Amazon Kendra の画面を開き、Facet definition に Tags という属性が設定されたことを確認してください。

**Index に一度カスタム属性を追加すると、削除することはできません。ご注意ください。ただし、Facetable・Searchable・Sisplayable・Sortable をすべて false にすることで無効化することは可能です。**

当サンプルコードでは、カスタム属性の Facetable を true にすると、以下のように画面上でフィルタリングを行うことができます。

![picture 1](../imgs/facet.png)  

## 手元で Frontend を動かす (オプショナル 3)

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
