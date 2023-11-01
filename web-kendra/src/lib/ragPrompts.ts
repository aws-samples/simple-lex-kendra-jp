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
  return `

Human: あなたは、文書検索で利用する Query を生成するAIアシスタントです。
以下の <procedure></procedure> の xml タグに囲われた手順通りに Query を生成してください。
<procedure>
1. 以下の <query-history></query-history> の xml タグに囲われた Query 履歴の内容を全て理解してください。履歴は古い順に並んでおり、一番下が最新のQueryです。
2. 「要約して」などの質問ではない Query は全て無視してください
3. 「〜って何？」「〜とは？」「〜を説明して」というような概要を聞く質問については、「〜の概要」と読み替えてください。
4. ユーザが最も知りたいことは、最も新しい Query の内容です。最も新しい Query の内容を元に、1 行で Query を生成してください。
5. 出力した Query に主語がない場合は、主語をつけてください。主語の置き換えは絶対にしないでください。
6. 主語や背景を補完する場合は、 <query-history></query-history> の xml タグに囲われた Query 履歴の内容を元に補完してください。
7. Queryは「〜について」「〜を教えてください」「〜について教えます」などの語尾は絶対に使わないでください
8. 出力する Query がない場合は、「No Query」と出力してください
9. 出力は生成したQueryだけにしてください。他の文字列は一切出力してはいけません。例外はありません。
</procedure>
<query-history>
${queries.map((q) => `* ${q}`).join('\n')}
</query-history>
Assistant: 
`;
};

export const basicPrompt = (
  referenceItems: RetrieveResultItem[],
  messages: Message[]
) => {
  return `

Human: あなたは日本語をよく理解して回答する AI アシスタントです。
Assistant: はい、そのとおりです。
Human : 今から検索サービスから得た情報をいくつか渡すのでその情報だけを覚えてください。
情報は <reference-information></reference-information> タグに囲まれた部分にあり複数あります。
情報の一つ一つは、<info-x></info-x> という xml タグに囲まれます。
info-x の x はインデックス番号で整数が入ります。
情報には JSON が入っており、<information-format></information-format> という xml タグに囲まれたフォーマットで記述されています。
<info-format>
{
  "DocumentId": ドキュメントの ID,
  "DocumentTitle": ドキュメントのタイトル,
  "DocumentURI": ドキュメントのURI,
  "Content" ドキュメントの内容
}
</info-format>
Assistant: はい、わかりました。
Human: <reference-information>
${referenceItems
  .map((item,index) => {
    return `<info-${index}> ${JSON.stringify({
      DocumentId: item.DocumentId,
      DocumentTitle: item.DocumentTitle,
      DocumentURI: item.DocumentURI,
      Content: item.Content,
    })}</info-${index}>`;
  })
  .join('\n')}
</reference-information>
Assistant: はい、覚えました。
Human: 今、覚えた情報だけを使って質問に回答してください。ただし、回答を出力するにあたって、以下の <rule></rule> で囲まれた回答のルールを必ず守ってください。
<rule>
* 今、覚えた情報だけを使ってください。今、覚えていない情報は絶対に使ってはいけません。例外はありません。
* 覚えた情報で質問に回答できない場合は「回答に必要な情報が見つかりませんでした。」と出力してください。例外はありません。
* 質問に具体性がなく回答できない場合は、質問の仕方をアドバイスしてください。
* 回答文以外の文字列は一切出力しないでください。回答は JSON 形式ではなく、テキストで出力してください。見出しやタイトル等も出力してはいけません。例外はありません。
* 質問は <question></question> の xml タグに囲われて渡されます。
</rule>
Assistant: 理解しました。ルールを必ず遵守します。質問はなんですか？
${messages
  .map((message) => {
    return `${message.role === 'user' ? `Human: <question>${message.content}</question>` : `Assistant: ${message.content}`}`;
  })
  .join('\n')}`;
};

export const referencedDocumentsPrompt = (
  referenceItems: RetrieveResultItem[],
  messages: Message[]
) => {
  return `${basicPrompt(referenceItems, messages)}
Human: 先ほど回答を作成するにあたって使用した <reference-information></reference-information> の xml タグに囲われた情報を出力してください。
以下の <reference-document-json></reference-document-json> の xml タグで囲われた JSON フォーマットの配列で出力してください。
<reference-document-json>
[{
    "DocumentId": "回答の参考にした「参考ドキュメント」のDocumentIdを記載してください。"
    "DocumentTitle": "回答の参考にした「参考ドキュメント」のDocumentTitleを記載してください。",
    "DocumentURI": "回答の参考にした「参考ドキュメント」のDocumentURIを記載してください。",
}]
</reference-document-json>
ただし JSON 以外の文字列は一切出力してはいけません。<reference-document-json></reference-document-json>  の xml のタグで囲ってもいけません。
無機質に配列の中に入れた JSON だけを出力してください。例外はありません。
参考にしたドキュメントが複数ある場合は、JSON を配列の中で複数出力してください。
Assistant: 
`;
};