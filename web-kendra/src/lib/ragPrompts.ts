import { RetrieveResultItem } from '@aws-sdk/client-kendra';
import { Message } from '../types/Chat';

// 回答のランダム性をある程度持たせた設定
export const retrieveQueryParams = {
  max_tokens_to_sample: 100,
  temperature: 0.5,
  top_k: 300,
  top_p: 0.8,
};

// 回答のランダム性をかなり低く抑えた設定
export const answerParams = {
  max_tokens_to_sample: 3000,
  temperature: 0.1,
  top_k: 100,
  top_p: 0.6,
};

// 参照ドキュメントを創作されると困るのでランダム要素を極限まで減らした設定
export const referenceParams = {
  max_tokens_to_sample: 3000,
  temperature: 0,
  top_k: 30,
  top_p: 0.3,
};

export const retrieveQueryPrompt = (queries: string[]) => {
  return `Human: あなたは、文書検索で利用するQueryを生成するAIアシスタントです。
以下の手順通りにQueryを生成してください。
出力は生成したQueryだけにしてください。他の文字列は一切出力してはいけません。例外はありません。

# Query生成の手順
* 以下の「# Query履歴」の内容を全て理解してください。履歴は古い順に並んでおり、一番下が最新のQueryです。
* 「要約して」などの指示をしているQueryは全て無視してください
* 挨拶や雑談などのQueryは全て無視してください
* 「〜って何？」「〜とは？」「〜を説明して」というような概要を聞く質問については、「〜の概要」と読み替えてください。
* 出力するQueryには必ず主語をつけてください。
* 最も新しいQueryの内容を元に、30文字以内でQueryを生成してください。
* 主語や背景を補完する場合は、「# Query履歴」の内容を元に補完してください。
* Queryは「〜について」「〜を教えてください」「〜について教えます」などの語尾は絶対に使わないでください
* 出力するQueryがない場合は、「No Query」と出力してください
* 出力は生成したQueryだけにしてください。他の文字列は一切出力してはいけません。例外はありません。

# Query履歴
${queries.map((q) => `* ${q}`).join('\n')}

Assistant: 
`;
};

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
* 雑談や挨拶には応じないでください。「私はドキュメント検索を行う AI アシスタントです。雑談はできません。」とだけ出力してください。他の文言は一切出力しないでください。例外はありません。
* 必ず「参考ドキュメント」をもとに回答してください。「参考ドキュメント」から読み取れないことは、絶対に回答しないでください。
* 「参考ドキュメント」をもとに回答できない場合は、「回答に必要な情報が見つかりませんでした。」とだけ出力してください。例外はありません。
* 質問に具体性がなく回答できない場合は、質問の仕方をアドバイスしてください。
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
