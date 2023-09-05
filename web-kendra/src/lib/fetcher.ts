import { QueryResult } from '@aws-sdk/client-kendra';
import { FilterType } from '../components/FilterResult';

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

export const predict = async (prompt: string): Promise<string> => {
  const res = await fetch(API_ENDPOINT + '/predict', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
    }),
  });

  if (!res.ok) {
    throw new Error(`API Error (${res.status})`);
  }

  const result = await res.json();

  return result.completion;
};
