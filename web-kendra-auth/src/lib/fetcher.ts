import { Auth } from 'aws-amplify';

export const getJwtToken = async () => {
  const user = await Auth.currentAuthenticatedUser();
  if (!user) {
    return null;
  }
  return (await Auth.currentSession()).getIdToken().getJwtToken();
};

// [Auth 拡張実装] 認証トークン設定のために、fetch を Wrap した関数を利用する
export const fetcher = async (endpoint: string, option: RequestInit) => {
  const token = await getJwtToken();
  if (!token) {
    // デモのため、エラー処理は Alert を表示するだけの簡易的な実装
    alert(
      '認証トークンが取得できませんでした。サインアウトしてから再度試してみてください。'
    );
    throw new Error('ログインしていません。');
  }

  return fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      // [Auth 拡張実装] 認証用ヘッダを設定
      Authorization: token,
    },
    ...option,
  });
};
