import { sendQuery } from './fetcher';
import useLoginUser from './useLoginUser';

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT!;

const useQuery = () => {
  const { token } = useLoginUser();

  return {
    send: (query: string) => {
      // [Auth 拡張実装] JWT トークンが取得できていない場合は処理しない
      if (!token) {
        // デモのため、エラー処理は Alert を表示するだけの簡易的な実装
        alert(
          '認証トークンが取得できませんでした。サインアウトしてから再度試してみてください。'
        );
        return;
      }

      // [Auth 拡張実装] 認証用の JWT トークンの設定
      return sendQuery(API_ENDPOINT, query, token);
    },
  };
};

export default useQuery;
