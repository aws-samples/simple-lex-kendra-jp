# Amazon Lex v2 プロジェクトのデプロイ

基本的な手順は Amazon Kendra プロジェクト時と同様です。以下のコマンドを実行してください。

```bash
npx cdk deploy SimpleLexV2Stack
```

Amazon Lex v2 のプロジェクトは Amazon Kendra の機能を一部利用します。そのため、先に Amazon Kendra のプロジェクトをデプロイしないと、Amazon Lex v2 のプロジェクトをデプロイすることはできません。依存関係は AWS CDK によって自動で解決されるため、上記コマンドを実行すると、先に Amazon Kendra のプロジェクトがデプロイされている様子がわかると思います。

以下のような出力であれば成功です。`SimpleLexV2Stack.LexV2SampleFrontend` が出力している URL にアクセスして、サンプルのプロジェクトを開いてください。

```
Outputs:
SimpleLexV2Stack.BotAliasId = ...
SimpleLexV2Stack.BotId = ...
SimpleLexV2Stack.IdentityPoolId = ...
SimpleLexV2Stack.LexV2SampleFrontend = ...
```

## Chatbot の実行

右下のヘッドセットのアイコンをクリックすることで Chatbot を開始できます。

「貸与された PC を交換する」フローを Amazon Lex v2 に定義しています。([定義](/lib/simple-lexv2-stack.ts)) 試しに「PC交換」と発話してください。やりとりを行い、最終的に「申請が完了しました」となれば成功です。

![lexv2-pc-replacement.png](/imgs/lexv2-pc-replacement.png)

## 連携した Amazon Kendra の実行

定義したフローから外れた予想外の発話に対しては、Amazon Kendra による社内ドキュメント検索を行います。なお、定義されたフローは前述した PC 交換のみです。試しに「パスワードを更新する方法」と発話してみてください。Amazon Kendra からの答えが表示されれば成功です。

![lexv2-update-password.png](/imgs/lexv2-update-password.png)

## 音声入力

Chatbot 左下のマイクのアイコンをクリックすると音声入力できます。

## 手元で Frontend を動かす (オプショナル 1)

手元の PC で Frontend アプリを実行します。Backend をデプロイしておく必要があるため、CDK のデプロイは完了していることを想定しています。以下のコマンドは全て `/web-lexv2` ディレクトリで実行してください。

```bash
export REACT_APP_IDENTITY_POOL_ID=<Identity Pool ID>
export REACT_APP_BOT_ID=<Bot ID>
export REACT_APP_BOT_ALIAS_ID=<Bot Alias ID>
export REACT_APP_REGION=us-east-1
```

> - 上記 `<...>` の値は `npx cdk deploy SimpleKendraStack` の出力を確認して適切な値に書き換えてください。
>   - `<Identity Pool ID>` は `SimpleLexV2Stack.IdentityPoolId = ...`
>   - `<Bot ID>` は `SimpleLexV2Stack.BotId = ...`
>   - `<Bot Alias ID>` は `SimpleLexV2Stack.BotAliasId = ...`
> - `npx cdk deploy SimpleLexV2Stack` の出力が確認できない場合は、再度デプロイコマンドを実行して出力を確認するか、[CloudFormation](https://console.aws.amazon.com/cloudformation) の SimpleLexV2Stack から Outputs タブで確認してください。

続いて、必要なモジュールをインストールして 3000 番ポートで待ち受けを開始します。

```bash
npm install
npm run start
```

自動でブラウザが開いて、Frontend にアクセスできると思います。

## Next Step

[Tech Knowledge](/guide/05_TECH_KNOWLEDGE.md)
