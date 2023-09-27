import { Auth } from 'aws-amplify';
import { CognitoUserSession } from 'amazon-cognito-identity-js';
import { useEffect, useState } from 'react';

// [Auth 拡張実装] ログインユーザを管理するHooks
const useLoginUser = () => {
  const [session, setSession] = useState<CognitoUserSession | undefined>();

  useEffect(() => {
    Auth.currentSession().then((s) => {
      setSession(s);
    });
  }, []);

  return {
    userGroup: session?.getIdToken().payload['cognito:groups'] ?? null,
    email: session?.getIdToken().payload['email'] ?? null,
  };
};

export default useLoginUser;
