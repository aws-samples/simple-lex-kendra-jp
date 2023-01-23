export const sendQuery = async (api: string, query: string) => {
  const res = await fetch(api, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
    }),
  });

  if (!res.ok) {
    throw new Error(`API Error (${res.status})`);
  }

  const items = (await res.json()).ResultItems;

  if (!items) {
    throw new Error(`Items not found`);
  }

  return items;
};
