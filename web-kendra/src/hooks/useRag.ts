import { useCallback, useEffect, useMemo, useState } from 'react';
import { sendQuery } from '../lib/fetcher';
import { RetrieveResult, RetrieveResultItem } from '@aws-sdk/client-kendra';
import { Message } from '../types/Chat';
import { produce } from 'immer';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import {
  InvokeWithResponseStreamCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT!;

const predictStream = async function* (prompt: string) {
  const region = process.env.REACT_APP_REGION!;
  const idPoolId = process.env.REACT_APP_IDENTITY_POOL_ID!;
  const lambda = new LambdaClient({
    region,
    credentials: fromCognitoIdentityPool({
      identityPoolId: idPoolId,
      clientConfig: { region: region },
    }),
  });

  const res = await lambda.send(
    new InvokeWithResponseStreamCommand({
      FunctionName: process.env.REACT_APP_PREDICT_STREAM_FUNCTION_ARN,
      Payload: JSON.stringify({
        prompt: prompt,
      }),
    })
  );
  const events = res.EventStream!;

  for await (const event of events) {
    console.log(event);
    if (event.PayloadChunk) {
      yield new TextDecoder('utf-8').decode(event.PayloadChunk.Payload);
    }

    if (event.InvokeComplete) {
      break;
    }
  }
};

const useRag = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [retrievedItems, setRetrievedItems] = useState<RetrieveResultItem[]>(
    []
  );
  const [referencedItems, setReferencedItems] = useState<string[]>([]);

  const embededItems = useMemo<RetrieveResultItem[]>(() => {
    if (referencedItems.length === 0) {
      return retrievedItems;
    } else {
      return retrievedItems
        .filter(
          (item) =>
            referencedItems.findIndex(
              (refItem) => refItem === item.DocumentId
            ) > -1
        )
        .map((item) => ({
          DocumentId: item.DocumentId,
          DocumentTitle: item.DocumentTitle,
          DocumentURI: item.DocumentURI,
          Content: item.Content,
        }));
    }
  }, [referencedItems, retrievedItems]);

  useEffect(() => {
    console.log(embededItems);
  }, [embededItems]);

  const prompt = useMemo(() => {
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
* 回答した後に、回答の参考にした「参考ドキュメント」の情報を出力してください。回答の後に「<< Documents >>」と出力して、その後に続けて「参考ドキュメント」の情報を出力してください。
* 回答の参考にした「参考ドキュメント」は、「# 回答の元になった参考ドキュメントのJSON形式」のフォーマットで必ずJSON形式で出力してください。複数参考にした場合は、配列で設定してください。
* 回答の中に「Human:」「Assistant:」「<< Documents >>」は絶対に含めないでください。例外はありません。

# 回答の元になった参考ドキュメントのJSON形式
{
    "DocumentId": "回答の参考にした「参考ドキュメント」のDocumentIdを記載してください。"
}[]


Assistant: I understand
Human: Reference documents
Assistant: Start
${embededItems
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
Assistant: 
`;
  }, [embededItems, messages]);

  const postMessage = useCallback(async () => {
    setMessages(
      produce(messages, (draft) => {
        draft.push({
          role: 'assistant',
          content: '',
        });
      })
    );

    const stream = predictStream(prompt);
    let tmp = '';
    let isAnswer = true;
    for await (const chunk of stream) {
      console.log(chunk);
      tmp += chunk;

      if (tmp.includes('<< Documents >>')) {
        isAnswer = false;
        // const [docs, answer] = tmp
        //   .split("<< Documents >>")
        //   .filter((s) => s.trim() !== '');

        // tmp = answer ?? '';

        // setReferencedItems(
        //   produce(referencedItems, (draft) => {
        //     draft.push(
        //       ...(
        //         JSON.parse(docs) as {
        //           DocumentId: string;
        //         }[]
        //       ).map((v) => v.DocumentId)
        //     );
        //   })
        // );

        // setMessages(
        //   produce(messages, (draft) => {
        //     draft.push({
        //       role: 'assistant',
        //       content: '',
        //       references: [
        //         {
        //           title: 'テストドキュメント',
        //           uri: 'xxx',
        //         },
        //       ],
        //     });
        //   })
        // );
      }

      if (isAnswer) {
        setMessages(
          // eslint-disable-next-line no-loop-func
          produce(messages, (draft) => {
            draft.push({
              role: 'assistant',
              content: tmp,
            });
          })
        );
      }
    }
  }, [messages, prompt]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    const lastMessage = messages[messages.length - 1];

    if (lastMessage.role === 'user') {
      postMessage();
    }
  }, [messages, prompt, referencedItems]);

  return {
    messages,
    retrieve: (query: string) => {
      return sendQuery<RetrieveResult>(API_ENDPOINT + '/retrieve', query);
    },

    predict: async (content: string) => {
      const res = await sendQuery<RetrieveResult>(
        API_ENDPOINT + '/retrieve',
        content
      );
      setRetrievedItems(
        produce(retrievedItems, (draft) => {
          if (res.ResultItems) {
            draft.push(...res.ResultItems);
          }
        })
      );

      setMessages(
        produce(messages, (draft) => {
          draft.push({
            role: 'user',
            content: content,
          });
        })
      );
    },
  };
};

export default useRag;
