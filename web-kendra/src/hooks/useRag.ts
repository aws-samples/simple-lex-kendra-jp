import { useCallback, useEffect, useState } from 'react';
import { predict, sendQuery } from '../lib/fetcher';
import { RetrieveResult, RetrieveResultItem } from '@aws-sdk/client-kendra';
import { Message } from '../types/Chat';
import { produce } from 'immer';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import {
  InvokeWithResponseStreamCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import { basicPrompt, referencedDocumentsPrompt } from '../lib/ragPrompts';

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
        prompt: prompt + 'Assistant: ',
      }),
    })
  );
  const events = res.EventStream!;

  for await (const event of events) {
    if (event.PayloadChunk) {
      yield new TextDecoder('utf-8').decode(event.PayloadChunk.Payload);
    }

    if (event.InvokeComplete) {
      break;
    }
  }
};

const useRag = () => {
  const [loading, setLoading] = useState(false);
  const [loadingReference, setLoadingReference] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [queueGetReference, setQueueGetReference] = useState<number[]>([]);

  const [retrievedItems, setRetrievedItems] = useState<RetrieveResultItem[]>(
    []
  );

  // チャットの処理
  const postMessage = useCallback(async () => {
    setMessages(
      produce(messages, (draft) => {
        draft.push({
          role: 'assistant',
          content: '',
        });
      })
    );

    setLoading(true);
    const stream = predictStream(basicPrompt(retrievedItems, messages));
    let tmp = '';
    for await (const chunk of stream) {
      tmp += chunk;
      setLoading(false);
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
    setQueueGetReference([...queueGetReference, messages.length]);
  }, [messages, queueGetReference, retrievedItems]);

  // 参照ドキュメントを取得する処理
  useEffect(() => {
    console.log(queueGetReference, messages, loadingReference);
    if (
      queueGetReference.length > 0 &&
      messages[queueGetReference[0]].content !== '' &&
      !loadingReference
    ) {
      (async () => {
        try {
          setLoadingReference(true);
          setMessages(
            produce(messages, (draft) => {
              draft[queueGetReference[0]].loadingReference = true;
            })
          );

          // const res = await predict(
          //   API_ENDPOINT + '/predict',
          //   referencedDocumentsPrompt(retrievedItems, [
          //     ...messages.slice(0, queueGetReference[0] + 1),
          //   ])
          // ).finally(() => {
          //   setLoadingReference(false);
          //   produce(messages, (draft) => {
          //     draft[queueGetReference[0]].loadingReference = false;
          //   });
          // });

          const stream = predictStream(
            referencedDocumentsPrompt(retrievedItems, [
              ...messages.slice(0, queueGetReference[0] + 1),
            ])
          );
          let tmp = '';
          for await (const chunk of stream) {
            tmp += chunk;
          }
          // console.log(JSON.parse(res).completion);
          console.log(tmp);

          // const refDocs: {
          //   DocumentId: string;
          //   DocumentTitle: string;
          //   DocumentURI: string;
          // }[] = JSON.parse(
          //   (JSON.parse(res).completion as string).replace('Assistant: ', '')
          // );
          const refDocs: {
            DocumentId: string;
            DocumentTitle: string;
            DocumentURI: string;
          }[] = JSON.parse(tmp);

          setMessages(
            // eslint-disable-next-line no-loop-func
            produce(messages, (draft) => {
              draft[queueGetReference[0]].references = refDocs.map((d) => ({
                title: d.DocumentTitle,
                uri: d.DocumentURI,
              }));
              draft[queueGetReference[0]].loadingReference = false;
            })
          );
        } catch {
          console.error('参照ドキュメントの取得に失敗しました。');
          setMessages(
            produce(messages, (draft) => {
              draft[queueGetReference[0]].loadingReference = false;
            })
          );
        } finally {
          setLoadingReference(false);
          setQueueGetReference(queueGetReference.splice(1));
        }
      })();
    }
  }, [queueGetReference, messages, loadingReference, retrievedItems]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    const lastMessage = messages[messages.length - 1];

    if (lastMessage.role === 'user') {
      postMessage();
    }
  }, [messages, postMessage]);

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
        // produce(retrievedItems, (draft) => {
        //   if (res.ResultItems) {
        //     draft.push(...res.ResultItems);
        //   }
        // })
        res.ResultItems ?? []
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
