import { predict, predictStream, sendQuery } from '../lib/fetcher';
import { RetrieveResult, RetrieveResultItem } from '@aws-sdk/client-kendra';
import { Message } from '../types/Chat';
import { produce } from 'immer';
import {
  answerParams,
  basicPrompt,
  referenceParams,
  referencedDocumentsPrompt,
  retrieveQueryParams,
  retrieveQueryPrompt,
} from '../lib/ragPrompts';
import { create } from 'zustand';
import { useState } from 'react';

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT!;

const useRagState = create<{
  loading: boolean;
  messages: Message[];
  pushNewPredictContent: (content: string) => void;
  removeLatestMessage: () => void;
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
    const query = await predict(
      retrieveQueryPrompt(contents),
      retrieveQueryParams
    );
    if (query.trim() === 'No Query') {
      return contents.slice(-1)[0];
    }
    return query;
  };

  // メッセージの送信
  const predictAnswer = async (retrievedItems: RetrieveResultItem[]) => {
    try {
      const stream = predictStream(
        basicPrompt(retrievedItems, get().messages),
        answerParams
      );
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
        ]),
        referenceParams
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
    removeLatestMessage: () => {
      set((state) => ({
        messages: produce(state.messages, (draft) => {
          draft.pop();
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
    removeLatestMessage,
  } = useRagState();

  const [hasError, setHasError] = useState(false);

  const postMessage = async (content: string) => {
    setHasError(false);
    try {
      pushNewPredictContent(content);
      const query = await getRetrieveQuery();

      const result = await sendQuery<RetrieveResult>(
        API_ENDPOINT + '/retrieve',
        query
      );
      const retrievedItems = result.ResultItems ?? [];
      await predictAnswer(retrievedItems);
      await setReference(retrievedItems);
    } catch (e) {
      console.error('回答中にエラーが発生しました。');
      console.error(e);

      setHasError(true);
      removeLatestMessage();
    }
  };

  return {
    hasError,
    loading,
    messages,
    clearMessages,
    postMessage,
    retryPostMessage: () => {
      let lastIndex = messages.length - 1;

      if (lastIndex < 0) {
        return;
      }

      if (messages[lastIndex].role === 'assistant') {
        const content = messages[lastIndex - 1].content;
        removeLatestMessage();
        removeLatestMessage();
        postMessage(content);
      } else {
        const content = messages[lastIndex].content;
        removeLatestMessage();
        postMessage(content);
      }
    },
  };
};

export default useRag;
