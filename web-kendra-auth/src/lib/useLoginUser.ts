import { Auth } from 'aws-amplify';
import { CognitoUserSession } from 'amazon-cognito-identity-js';
import { useEffect, useState } from 'react';

// [Auth 拡張実装] ログインユーザを管理するHooks
const useLoginUser = () => {
  const [session, setSession] = useState<CognitoUserSession | undefined>();

  useEffect(() => {
    Auth.currentSession().then((s) => setSession(s));
  }, []);

  return {
    token: session?.getAccessToken().getJwtToken() ?? '',
    userGroup:
      session?.getAccessToken().payload['cognito:groups'] ?? '[未所属]',
  };
};

export default useLoginUser;
