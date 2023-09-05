import { sendQuery } from '../lib/fetcher';
import { RetrieveResult, RetrieveResultItem } from '@aws-sdk/client-kendra';
import { Message } from '../types/Chat';
import { produce } from 'immer';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import {
  InvokeWithResponseStreamCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import { basicPrompt, referencedDocumentsPrompt } from '../lib/ragPrompts';
import { create } from 'zustand';

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
        prompt,
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

const useRagState = create<{
  loading: boolean;
  messages: Message[];
  pushNewPredictContent: (content: string) => void;
  predict: (retrievedItems: RetrieveResultItem[]) => Promise<void>;
  setReference: (retrievedItems: RetrieveResultItem[]) => Promise<void>;
}>((set, get) => {
  // メッセージの送信
  const predict = async (retrievedItems: RetrieveResultItem[]) => {
    try {
      const stream = predictStream(basicPrompt(retrievedItems, get().messages));
      let tmp = '';
      for await (const chunk of stream) {
        tmp += chunk;
        // eslint-disable-next-line no-loop-func
        set((state) => ({
          messages: produce(state.messages, (draft) => {
            draft[state.messages.length - 1].content = tmp;
          }),
        }));
      }
    } finally {
      set(() => ({
        loading: false,
      }));
    }
  };

  const setReference = async (retrievedItems: RetrieveResultItem[]) => {
    const targetIndex = get().messages.length - 1;
    try {
      set((state) => ({
        messages: produce(state.messages, (draft) => {
          draft[targetIndex].loadingReference = true;
        }),
      }));

      const stream = predictStream(
        referencedDocumentsPrompt(retrievedItems, [
          ...get().messages.slice(0, targetIndex + 1),
        ])
      );
      let tmp = '';
      for await (const chunk of stream) {
        tmp += chunk;
      }
      const refDocs: {
        DocumentId: string;
        DocumentTitle: string;
        DocumentURI: string;
      }[] = JSON.parse(tmp);

      set((state) => ({
        messages: produce(state.messages, (draft) => {
          draft[targetIndex].references = refDocs.map((d) => ({
            title: d.DocumentTitle,
            uri: d.DocumentURI,
          }));
        }),
      }));
    } catch {
      console.error('参照ドキュメントの取得に失敗しました。');
    } finally {
      set((state) => ({
        messages: produce(state.messages, (draft) => {
          draft[targetIndex].loadingReference = false;
        }),
      }));
    }
  };

  return {
    loading: false,
    messages: [],
    pushNewPredictContent: (content: string) => {
      set((state) => ({
        loading: true,
        messages: produce(state.messages, (draft) => {
          draft.push({
            role: 'user',
            content: content,
          });
          draft.push({
            role: 'assistant',
            content: '',
          });
        }),
      }));
    },
    predict,
    setReference,
  };
});

const useRag = () => {
  const { loading, messages, predict, setReference, pushNewPredictContent } =
    useRagState();

  return {
    loading,
    messages,
    postMessage: async (content: string) => {
      pushNewPredictContent(content);

      const result = await sendQuery<RetrieveResult>(
        API_ENDPOINT + '/retrieve',
        content
      );
      const retrievedItems = result.ResultItems ?? [];
      await predict(retrievedItems);
      await setReference(retrievedItems);
    },
  };
};

export default useRag;
