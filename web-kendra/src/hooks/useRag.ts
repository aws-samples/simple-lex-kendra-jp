import { predict, sendQuery } from '../lib/fetcher';
import { RetrieveResult, RetrieveResultItem } from '@aws-sdk/client-kendra';
import { Message } from '../types/Chat';
import { produce } from 'immer';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import {
  InvokeWithResponseStreamCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import {
  basicPrompt,
  referencedDocumentsPrompt,
  retrieveQueryPrompt,
} from '../lib/ragPrompts';
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
  clearMessages: () => void;
  getRetrieveQuery: () => Promise<string>;
  predictAnswer: (retrievedItems: RetrieveResultItem[]) => Promise<void>;
  setReference: (retrievedItems: RetrieveResultItem[]) => Promise<void>;
}>((set, get) => {
  // RetrieveするためのQueryを生成
  const getRetrieveQuery = async () => {
    const contents = get()
      .messages.filter((m) => m.role === 'user')
      .map((m) => m.content);
    const query = await predict(retrieveQueryPrompt(contents));
    if (query.trim() === 'No Query') {
      return contents.slice(-1)[0];
    }
    return query;
  };

  // メッセージの送信
  const predictAnswer = async (retrievedItems: RetrieveResultItem[]) => {
    try {
      const stream = predictStream(basicPrompt(retrievedItems, get().messages));
      for await (const chunk of stream) {
        set((state) => ({
          messages: produce(state.messages, (draft) => {
            const content = draft[state.messages.length - 1].content;
            draft[state.messages.length - 1].content =
              content.slice(0, -1) + chunk + '▍';
          }),
        }));
      }

      set((state) => ({
        messages: produce(state.messages, (draft) => {
          const content = draft[state.messages.length - 1].content;
          draft[state.messages.length - 1].content = content.slice(0, -1);
        }),
      }));
    } finally {
      set(() => ({
        loading: false,
      }));
    }
  };

  // 参考ドキュメント
  const setReference = async (retrievedItems: RetrieveResultItem[]) => {
    const targetIndex = get().messages.length - 1;

    // 回答できないとLLMが判断した場合は、参照ドキュメントの検索は行わない
    // Promptで回答に必要な情報がない場合や、雑談した場合に特定の文言を出力するように指示している
    if (
      /雑談はできません。|回答に必要な情報が見つかりませんでした。/.test(
        get().messages[targetIndex].content
      )
    ) {
      return;
    }

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
      set((state) => ({
        messages: produce(state.messages, (draft) => {
          draft[targetIndex].references = [];
        }),
      }));
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
    clearMessages: () => {
      set(() => ({
        messages: [],
      }));
    },
    getRetrieveQuery,
    predictAnswer,
    setReference,
  };
});

const useRag = () => {
  const {
    loading,
    messages,
    predictAnswer,
    getRetrieveQuery,
    setReference,
    pushNewPredictContent,
    clearMessages,
  } = useRagState();

  return {
    loading,
    messages,
    clearMessages,
    postMessage: async (content: string) => {
      pushNewPredictContent(content);

      const query = await getRetrieveQuery();

      const result = await sendQuery<RetrieveResult>(
        API_ENDPOINT + '/retrieve',
        query
      );
      const retrievedItems = result.ResultItems ?? [];
      await predictAnswer(retrievedItems);
      await setReference(retrievedItems);
    },
  };
};

export default useRag;
