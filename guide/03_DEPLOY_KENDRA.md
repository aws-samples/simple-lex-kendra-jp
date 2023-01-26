# Amazon Kendra プロジェクトのデプロイ

以下のコマンドを実行してください。途中でセキュリティに関連した変更について確認が求められますので、`y` を入力して Enter キーを押下してください。確認をスキップしたい場合は、デプロイコマンドに `--require-approval never` オプションを追加してください。

```bash
npx cdk deploy SimpleKendraStack
```

以下のような出力であれば成功です。`SimpleKendraStack.KendraSampleFrontend` にサンプルの URL が表示されていますが、アクセスする前に、以下のデータ取り込みを実施してください。

```
SimpleKendraStack.DataSourceBucketName = ...
SimpleKendraStack.ExportsOutputFnGetAttKendraIndexArn7ABEB122 = ...
SimpleKendraStack.ExportsOutputRefKendraIndex7C32BDCD = ...
SimpleKendraStack.FaqBucketName = ...
SimpleKendraStack.IdentityPoolId = ...
SimpleKendraStack.KendraApiEndpointF276F28B = ...
SimpleKendraStack.KendraIndexId = ...
SimpleKendraStack.KendraSampleFrontend = ...
```

## データの取り込み

サンプルのサイトを開く前に、データの取り込みを手動で行います。

[Amazon Kendra](https://console.aws.amazon.com/kendra/home) を開き、simple-index-by-cdk を選択して、左カラムの Data sources から s3-data-source をクリックします。右上の Actions から Edit を選択し、Default Language を Japanese に変更します。それ以外はそのままにして、保存してください。最後に、右上の Sync now をクリックして、同期を実施してください。

> - 現状、Amazon Kendra の DataSource のデフォルト言語を AWS CDK (AWS CloudFormation) で指定することができないため、このような手動対応が必要になります。
> - 初回の Sync の前にデフォルト言語を変更する必要があります。(デフォルトの英語のドキュメントとして取り込まれてしまうため)

それでは、サンプルのプロジェクトにアクセスします。デプロイ完了時 AWS CDK が出力した `SimpleKendraStack.KendraSampleFrontend` の URL にアクセスしてください。例えば、「パスワードの更新」と検索すると、必要なツール名が表示されると思います。

> - 検索対象は [`/docs`](/docs) のテキストファイルです。そちらの内容をクエリのヒントにしてください。

## ドキュメントの追加

ドキュメントを追加する場合は、[`/docs`](/docs) ディレクトリに追加し、再度 `npx cdk deploy SimpleKendraStack` を実行して、手動で DataSource の Sync を実施します。(デフォルト言語の変更は 1 度行っているため不要です。)

> - 簡単のため、サンプルのドキュメントとしてとしてテキストファイル (`.txt`) を利用していますが、`.pdf` や `.html` などでも取り込めます。サポートされているファイルのフォーマットは[こちら](https://docs.aws.amazon.com/kendra/latest/dg/index-document-types.html)。

## FAQ の追加 (オプショナル 1)

Amazon Kendra に「よくある質問」を追加します。

[Amazon Kendra](https://console.aws.amazon.com/kendra/home) を開き、simple-index-by-cdk を選択して、左カラムの FAQs を選び、右上の Add FAQ をクリックします。FAQ の名前を適当に入力し (例: simple-faq)、Default Language を Japanese に変更します。また、FAQ File Format は .csv file - Basic を選択します。続いて、Browse S3 をクリックして、[`/faq`](/faq) をアップロードした S3 Bucket を選択します。検索フォームに simplekendrastack-faqbucket と入力すると 1 つの Bucket に絞られるので、そちらを選択します。最後に faq フォルダをクリックして、simple.csv を選択して Choose をクリックします。IAM Role は検索フォームに SimpleKendraStack-FaqRole と入力してサジェストされたものを選択します。あとは右下の Add をクリックすれば取り込みを開始します。

> - FAQ もデフォルトの言語を AWS CDK で指定することができません。また、FAQ の場合はデータの取り込みが自動で行われてしまうため、手動でデフォルトの言語を指定しつつ、データの指定が必要です。
> - ここでは最も簡単な `質問,回答,URL` 形式の csv ファイルとして定義していますが、[その他の方法](https://docs.aws.amazon.com/ja_jp/kendra/latest/dg/in-creating-faq.html)で定義することも可能です。

取り込みが完了したら、サンプルサイトにアクセスして「Slack ログイン 方法」と検索してください。「よくある質問」の項目が表示されたら、成功しています。

## Custom Data Source の追加 (オプショナル 2)

Amazon Kendra は多くの Native connectors を提供しています。([参考: Connectors](https://aws.amazon.com/kendra/connectors/)) しかし、中にはこれらの Connectors 以外のデータソースを利用したい場合もあると思います。その際に利用するのが Custom Data Source です。Custom Data Source にデータを追加する場合は、データのクロール、ドキュメントごとの ID の発行、インデックスしているドキュメントの管理などは独自で実装する必要があります。ここでは、それらは実装済みのものとして、基本的なインデックスへの登録方法のみを実装しています。

Custom Data Source そのものは CDK でデプロイされています。S3 の時と同様に [Amazon Kendra](https://console.aws.amazon.com/kendra/home) を開き、simple-index-by-cdk を選択して、左カラムの Data sources から custom-data-source をクリックします。右上の Actions から Edit を選択肢、Default Language を Japanese に変更してください。

データを挿入するための Lambda 関数は CDK でデプロイ済みです。[`/lambda/sync-custom-data-source.ts`](/lambda/sync-custom-data-source.ts) の `demoDocuments` という変数にインデックスするデータが定義されています。では、この Lambda 関数を実行します。[Lambda のコンソール](https://console.aws.amazon.com/lambda/home) を開き、SimpleKendraStack-SyncCustomDataSourceFunc... で始まる名前の関数をクリックしてください。ページ中部の Test タブをクリックして、右上の Test を実行してください。この際、パラメータなどは特に見ていないので、デフォルトのままで問題ありません。

実行に成功したら、[Amazon Kendra](https://console.aws.amazon.com/kendra/home) を開き、左カラムの Data sources から custom-data-source をクリックして、Sync run history を確認してください。Indexing... と表示されていればインデックス中で、Succeeded と出れば成功しています。Added の列は 1 になっているはずです。(1 つのドキュメントを追加。)

ではサンプルサイトにアクセスして、追加したドキュメントの内容を検索してみましょう。Kendra についてのドキュメントを追加したので、「Kendra」と検索してみてください。

このように、データさえフェッチできれば、基本的にはどのようなドキュメントでも Kendra に追加できます。この Lambda 関数を定期実行にすれば、自動で Indexing を実行することも可能です。また、今回はデータ形式として PLAIN_TEXT を指定していますが、HTML や PPT、PDF など多くのフォーマットにも対応しています。([参考: Types of documents](https://docs.aws.amazon.com/kendra/latest/dg/index-document-types.html))

## 手元で Frontend を動かす (オプショナル 3)

手元の PC で Frontend アプリを実行します。Backend をデプロイしておく必要があるため、CDK のデプロイは完了していることを想定しています。以下のコマンドは全て `/web-kendra` ディレクトリで実行してください。まず、以下のコマンドで必要な環境変数を設定します。

```bash
export REACT_APP_API_ENDPOINT=<Kendra API Endpoint *1>
export REACT_APP_IDENTITY_POOL_ID=<Identity Pool ID *2>
export REACT_APP_REGION=us-east-1
```

- *1) `npx cdk deploy SimpleKendraStack` の出力のうち、`SimpleKendraStack.KendraApiEndpointxxxx = ...` の形式で出力された Endpoint に `kendra` の path を追加したものを設定してください。最終的に https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/kendra のような値になります。
- *2) `npx cdk deploy SimpleKendraStack` の出力のうち、`SimpleKendraStack.IdentityPoolId = ...` の形式で出力されたものを設定してください。
- `npx cdk deploy SimpleKendraStack` の出力が確認できない場合は、再度デプロイコマンドを実行して出力を確認するか、[CloudFormation](https://console.aws.amazon.com/cloudformation) の SimpleKendraStack から Outputs タブで確認してください。

続いて、必要なモジュールをインストールして 3000 番ポートで待ち受けを開始します。

```bash
npm install
npm run start
```

自動でブラウザが開いて、Frontend にアクセスできると思います。

## Next Step

[Amazon Lex v2 プロジェクトのデプロイ](/guide/04_DEPLOY_LEXV2.md)
