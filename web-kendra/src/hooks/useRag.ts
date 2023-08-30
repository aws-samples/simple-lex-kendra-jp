import { useMemo, useState } from 'react';
import { predict, sendQuery } from '../lib/fetcher';
import { RetrieveResult } from '@aws-sdk/client-kendra';
import { Message } from '../types/Chat';

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT!;

const useRag = () => {
  const [prompt, setPrompt] = useState('');

  const contents = useMemo<Message[]>(() => {
    // Human -> Assistant -> Human... と連続していること前提
    return prompt
      .split(/Human:|Assistant:/)
      .filter((s) => s !== '')
      .map((v, idx) => ({
        role: idx % 2 === 0 ? 'user' : 'assistant',
        content: v,
      }));
  }, [prompt]);

  const messages = useMemo<Message[]>(() => {
    const contextEndIndex = contents.findIndex(
      (c) => c.content === '<< COMPLETED >>'
    );
    // return [
    //   {
    //     content: '',
    //     role: 'user',
    //   },
    // ];
    return contents.slice(contextEndIndex - 1);
  }, [contents]);

  const pushAssistantContent = (content: string) => {
    setPrompt(`${prompt}${content}
Human:`);
  };

  const pushUserContent = (content: string) => {
    setPrompt(`${prompt}${content}
Assistant:`);
  };

  return {
    messages,
    retrieve: (query: string) => {
      return sendQuery<RetrieveResult>(API_ENDPOINT + '/retrieve', query);
    },
    predictFromRetrivedItems: async (
      query: string,
      items: RetrieveResult['ResultItems']
    ) => {
      const initPrompt = `Human: あなたはユーザの質問に答えるAIアシスタントです。
以下の手順でユーザの質問に答えてください。手順以外のことは絶対にしないでください。

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
* 回答の中に「Human:」と「Assistant:」は絶対に含めないでください。例外はありません。
* 回答は以下のJSON形式で行なってください。JSON以外の文字は絶対に出力しないでください。

# 回答のJSON形式
{
  "answer": "質問の回答を記載してください。「参考ドキュメント」から回答できない場合は空白としてください。",
  "reference": {
    "DocumentId": "回答の参考にしたDocumentIdを記載してください。"
  }[]
}

理解したら「I understand」とだけ返信してください。
Assistant: I understand
Human: Reference documents
Assistant: Start
${items?.map((item) => {
  const output = {
    DocumentId: item.DocumentId,
    DocumentTitle: item.DocumentTitle,
    DocumentURI: item.DocumentURI,
    Content: item.Content,
  };
  return `Human: ${JSON.stringify(output)}
Assistant: Please continue`;
})}
Human: DONE
Assistant: << COMPLETED >>
Human: ${query}
Assistant:
`;
      setPrompt(initPrompt);
      const res = await predict(API_ENDPOINT + '/predict', initPrompt);

      setPrompt(initPrompt + res + '\nHuman:');
    },
    predict: async (content: string) => {
      const tmp = prompt + content + '\nAssistant:';
      setPrompt(tmp);
      const res = await predict(API_ENDPOINT + '/predict', tmp);

      setPrompt(tmp + res + '\nHuman:');
    },
  };
};

// 先ほどの回答に利用した「参考ドキュメント」をすべて教えてください。
// なお、出力は必ず以下のJSON形式にしてください。JSON以外の文字列は一切出力しないでください。例外はありません。

// 回答に利用した参考ドキュメントのJSONフォーマット
// {
// "DocumentId": "参考にしたドキュメントのDocumentId",
// "DocumentTitle": "参考にしたドキュメントのDocumentTitle",
// "DocumentURI": "参考にしたドキュメントのDocumentURI",
// }[]

export default useRag;
