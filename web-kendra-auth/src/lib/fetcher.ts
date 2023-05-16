export const sendQuery = async (api: string, query: string, token: string) => {
  const res = await fetch(api, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // [Auth 拡張実装] 認証用ヘッダを設定
      Authorization: token,
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
