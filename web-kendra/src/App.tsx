import React from 'react';
import ItemList from './components/ItemList';
import './App.css';
import { Authenticator } from '@aws-amplify/ui-react';
import { translations } from '@aws-amplify/ui-react';
import { Amplify, I18n } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import Menu from './components/Menu';

function App() {
  // AmplifyUI を利用してログイン機能の実装
  // Amplify と Cognito の連携設定
  Amplify.configure({
    Auth: {
      userPoolId: process.env.REACT_APP_USER_POOL_ID,
      userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
      authenticationFlowType: 'USER_SRP_AUTH',
    },
  });

  // Amplify UI の日本語化
  I18n.putVocabularies(translations);
  I18n.setLanguage('ja');

  return (
    <>
      <Authenticator
        hideSignUp={process.env.REACT_APP_SELF_SIGN_UP_ENABLED === "false"}
        components={{
          Header: () => {
            return (
              <div className="flex justify-center">
                <h1 className="text-4xl my-6 text-gray-600">Kendra サンプル</h1>
              </div>
            );
          },
        }}
      >
        {({ signOut }) => (
          <>
            <div className="overflow-hidden">
              <div
                id="main"
                className=" relative h-screen w-screen overflow-hidden overflow-y-auto scroll-mx-0"
              >
                <Menu onSignOut={signOut ?? (() => {})} />
                <ItemList />
              </div>
            </div>
          </>
        )}
      </Authenticator>
    </>
  );
}

export default App;
