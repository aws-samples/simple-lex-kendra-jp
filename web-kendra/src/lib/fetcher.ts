import { QueryResult } from '@aws-sdk/client-kendra';
import { FilterType } from '../components/FilterResult';
import { PredictParams } from '../types/Predict';
import {
  InvokeWithResponseStreamCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT!;

export const sendQuery = async <T = QueryResult>(
  api: string,
  query: string,
  filters?: FilterType[]
) => {
  const res = await fetch(api, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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

export const predict = async (
  prompt: string,
  params?: PredictParams
): Promise<string> => {
  const res = await fetch(API_ENDPOINT + '/predict', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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

export const predictStream = async function* (
  prompt: string,
  params?: PredictParams
) {
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
      break;
    }
  }
};
