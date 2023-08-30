import { useEffect, useMemo, useState } from 'react';
import { predict, sendQuery } from '../lib/fetcher';
import { RetrieveResult, RetrieveResultItem } from '@aws-sdk/client-kendra';
import { Message } from '../types/Chat';
import { produce } from 'immer';

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT!;

const useRag = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [retrievedItems, setRetrievedItems] = useState<RetrieveResultItem[]>(
    []
  );
  const [referencedItems, setReferencedItems] = useState<
    {
      DocumentId: string;
    }[]
  >([]);

  const embededItems = useMemo<RetrieveResultItem[]>(() => {
    console.log(
      referencedItems.map((item) => item.DocumentId),
      retrievedItems.map((item) => item.DocumentURI),
      retrievedItems
        .filter(
          (item) =>
            referencedItems.findIndex(
              (refItem) => refItem.DocumentId === item.DocumentId
            ) > -1
        )
        .map((item) => ({
          DocumentId: item.DocumentId,
          DocumentTitle: item.DocumentTitle,
          DocumentURI: item.DocumentURI,
          Content: item.Content,
        }))
    );
    if (referencedItems.length === 0) {
      return retrievedItems;
    } else {
      return retrievedItems
        .filter(
          (item) =>
            referencedItems.findIndex(
              (refItem) => refItem.DocumentId === item.DocumentId
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
* 回答の中に「Human:」「Assistant:」「<< Documents >>」「<< Answer >>」は絶対に含めないでください。例外はありません。
* 回答は以下のフォーマットで行なってください。フォーマットは絶対に変えないでください。
* 「# 回答のJSON形式」の「<< Documents >>」はJSON形式で出力してください。複数件データがある場合は配列で全て設定すること。

# 回答のJSON形式
<< Documents >>
{
    "DocumentId": "回答の参考にした「参考ドキュメント」のDocumentIdを記載してください。"
}[]
<< Answer >>
ここに回答を記載してください。<< Documents >>が0件の場合は、何も出力しないでください。

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

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    const lastMessage = messages[messages.length - 1];

    if (lastMessage.role === 'user') {
      predict(API_ENDPOINT + '/predict', prompt).then((res) => {
        const [refDocs, answer] = res
          .split(/<< Documents >>|<< Answer >>/)
          .filter((s) => s !== '');

        setReferencedItems(
          produce(referencedItems, (draft) => {
            draft.push(...JSON.parse(refDocs));
          })
        );

        setMessages(
          produce(messages, (draft) => {
            draft.push({
              role: 'assistant',
              content: answer,
            });
          })
        );
      });
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
