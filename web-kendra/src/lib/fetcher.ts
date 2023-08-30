import { QueryResult } from '@aws-sdk/client-kendra';
import { FilterType } from '../components/FilterResult';

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

export const predict = async (api: string, prompt: string) => {
  const res = await fetch(api, {
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

  const result = await res.text();

  return result;
};
