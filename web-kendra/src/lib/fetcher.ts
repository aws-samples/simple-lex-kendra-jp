import { QueryResult } from '@aws-sdk/client-kendra';
import { FilterType } from '../components/FilterResult';

export const sendQuery = async (
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

  const result: QueryResult = await res.json();

  return result;
};
