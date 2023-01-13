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

## FAQ の追加 (オプショナル)

Amazon Kendra に「よくある質問」を追加します。

[Amazon Kendra](https://console.aws.amazon.com/kendra/home) を開き、simple-index-by-cdk を選択して、左カラムの FAQs を選び、右上の Add FAQ をクリックします。FAQ の名前を適当に入力し (例: simple-faq)、Default Language を Japanese に変更します。また、FAQ File Format は .csv file - Basic を選択します。続いて、Browse S3 をクリックして、[`/faq`](/faq) をアップロードした S3 Bucket を選択します。検索フォームに simplekendrastack-faqbucket と入力すると 1 つの Bucket に絞られるので、そちらを選択します。最後に faq フォルダをクリックして、simple.csv を選択して Choose をクリックします。IAM Role は検索フォームに SimpleKendraStack-FaqRole と入力してサジェストされたものを選択します。あとは右下の Add をクリックすれば取り込みを開始します。

> - FAQ もデフォルトの言語を AWS CDK で指定することができません。また、FAQ の場合はデータの取り込みが自動で行われてしまうため、手動でデフォルトの言語を指定しつつ、データの指定が必要です。
> - ここでは最も簡単な `質問,回答,URL` 形式の csv ファイルとして定義していますが、[その他の方法](https://docs.aws.amazon.com/ja_jp/kendra/latest/dg/in-creating-faq.html)で定義することも可能です。

取り込みが完了したら、サンプルサイトにアクセスして「Slack ログイン 方法」と検索してください。「よくある質問」の項目が表示されたら、成功しています。

## Next Step

[Amazon Lex v2 プロジェクトのデプロイ](/guide/04_DEPLOY_LEXV2.md)
