import { RetrieveResultItem } from '@aws-sdk/client-kendra';
import { Message } from '../types/Chat';

export const basicPrompt = (
  referenceItems: RetrieveResultItem[],
  messages: Message[]
) => {
  return `Human: あなたはユーザの質問に答えるAIアシスタントです。
以下の手順でユーザの質問に答えてください。手順以外のことは絶対にしないでください。
理解したら「I understand」とだけ返信してください。

# 回答手順
* 私が「Reference documents」というコメントをします。このコメントの後に、「参考ドキュメント」を連続して送信していきます。
* あなたは「Reference documents」というコメントを受信したら、「Start」と返信してください。
* 続いてJSON形式で「参考ドキュメント」を連続で投稿していきます。フォーマットは「# 参考ドキュメントのJSON形式」に示します。あなたはドキュメントを受信したら「Please continue」とだけ返信してください。
* 私が全ての「参考ドキュメント」をすべて投稿したら「DONE」というコメントを送ります。あなたはこのコメントを受信したら「<< COMPLETED >>」と返信してください。
* あなたの「OK」というコメントの後に、私が質問を投稿します。あなたは「# 回答のルール」に沿って質問にJSON形式で回答してください。ルールは絶対です。例外はありません。

# 参考ドキュメントのJSON形式
{
  "DocumentId": "ドキュメントを一意に特定するIDです。",
  "DocumentTitle": "ドキュメントのタイトルです。",
  "DocumentURI": "ドキュメントが格納されているURIです。",
  "Content": "ドキュメントの内容です。こちらをもとに回答してください。",
}

# 回答のルール
* 必ず「参考ドキュメント」をもとに回答してください。「参考ドキュメント」から読み取れないことは、絶対に回答しないでください。
* 「参考ドキュメント」をもとに回答できない場合は、「解答に必要な情報が見つかりませんでした。」とだけ出力してください。例外はありません。
* 回答の中に「Human:」「Assistant:」は絶対に含めないでください。例外はありません。

Assistant: I understand
Human: Reference documents
Assistant: Start
${referenceItems
  .map((item) => {
    return `Human: ${JSON.stringify(item)}
Assistant: Please continue`;
  })
  .join('\n')}
Human: DONE
Assistant: << COMPLETED >>
${messages
  .map((message) => {
    return `${message.role === 'user' ? 'Human:' : 'Assistant: '} ${
      message.content
    }`;
  })
  .join('\n')}
`;
};

export const referencedDocumentsPrompt = (
  referenceItems: RetrieveResultItem[],
  messages: Message[]
) => {
  return `${basicPrompt(referenceItems, messages)}
Human: 先ほど回答の参考にした「参考ドキュメント」の情報を出力してください。
以下の「# 回答の元になった参考ドキュメントのJSON形式」のフォーマットで出力してください。
JSON以外の文字列は一才出力してはいけません。例外はありません。
参考にしたドキュメントが複数ある場合は、配列で出力してください。

# 回答の元になった参考ドキュメントのJSON形式
{
    "DocumentId": "回答の参考にした「参考ドキュメント」のDocumentIdを記載してください。"
    "DocumentTitle": "回答の参考にした「参考ドキュメント」のDocumentTitleを記載してください。",
    "DocumentURI": "回答の参考にした「参考ドキュメント」のDocumentURIを記載してください。",
}[]
Assistant: 
`;
};
