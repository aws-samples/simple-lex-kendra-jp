import { QueryResult, RetrieveResult } from '@aws-sdk/client-kendra';
import { FilterType } from '../components/FilterResult';
import { PredictParams } from '../types/Predict';
import {
  InvokeWithResponseStreamCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import { fetcher, getJwtToken } from '../lib/fetcher';

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT!;
const USER_POOL_ID = process.env.REACT_APP_USER_POOL_ID!;
const REGION = process.env.REACT_APP_REGION!;
const COGNITO_ID = `cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;

const sendQuery = async <T>(
  api: string,
  query: string,
  filters?: FilterType[]
) => {
  const res = await fetcher(API_ENDPOINT + api, {
    method: 'POST',
    body: JSON.stringify({
      query,
      filters,
    }),
  });

  if (!res.ok) {
    throw new Error(`API Error (${res.status})`);
  }

  const result: T = await res.json();

  return result;
};

const predict = async (
  prompt: string,
  params?: PredictParams
): Promise<string> => {
  const res = await fetcher(API_ENDPOINT + '/predict', {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      params,
    }),
  });

  if (!res.ok) {
    throw new Error(`API Error (${res.status})`);
  }

  const result = await res.json();

  return result.completion;
};

/**
 * API を実行するための Hooks
 * [Auth 拡張実装] 認証トークンを設定する必要があるため、Hooks で実装
 * @returns
 */
const useApi = () => {
  return {
    query: async (query: string, filters?: FilterType[]) => {
      return sendQuery<QueryResult>('', query, filters);
    },
    retrieve: async (query: string, filters?: FilterType[]) => {
      return sendQuery<RetrieveResult>('/retrieve', query, filters);
    },
    predict: async (prompt: string, params?: PredictParams) => {
      return predict(prompt, params);
    },
    predictStream: async function* (prompt: string, params?: PredictParams) {
      const token = await getJwtToken();
      if (!token) {
        // デモのため、エラー処理は Alert を表示するだけの簡易的な実装
        alert(
          '認証トークンが取得できませんでした。サインアウトしてから再度試してみてください。'
        );
        return;
      }

      const region = process.env.REACT_APP_REGION!;
      const idPoolId = process.env.REACT_APP_IDENTITY_POOL_ID!;
      const lambda = new LambdaClient({
        region,
        credentials: fromCognitoIdentityPool({
          identityPoolId: idPoolId,
          clientConfig: { region: region },
          // [Auth 拡張実装] ログイン情報を付与する
          logins: {
            [COGNITO_ID]: token,
          },
        }),
      });

      const res = await lambda.send(
        new InvokeWithResponseStreamCommand({
          FunctionName: process.env.REACT_APP_PREDICT_STREAM_FUNCTION_ARN,
          Payload: JSON.stringify({
            prompt,
            params,
          }),
        })
      );
      const events = res.EventStream!;

      for await (const event of events) {
        if (event.PayloadChunk) {
          yield new TextDecoder('utf-8').decode(event.PayloadChunk.Payload);
        }

        if (event.InvokeComplete) {
          if (event.InvokeComplete.ErrorCode) {
            throw new Error('推論中にエラーが発生しました。');
          }
          break;
        }
      }
    },
  };
};

export default useApi;
