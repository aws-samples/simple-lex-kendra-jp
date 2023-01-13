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

## Next Step

[Tech Knowledge](/guide/05_TECH_KNOWLEDGE.md)
