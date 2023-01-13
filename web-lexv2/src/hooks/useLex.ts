import { useState } from 'react';
import {
  LexRuntimeV2Client,
  PutSessionCommand,
  RecognizeTextCommand,
  DeleteSessionCommand,
  SessionState,
} from '@aws-sdk/client-lex-runtime-v2';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

const generateRandomString = () => {
  return Math.random().toString(32).substring(2);
};

interface UseLexProps {
  botId: string;
  botAliasId: string;
  localeId: string;
  identityPoolId: string;
  region: string;
}

export interface Content {
  content: string;
  contentType: string;
}

export interface Message {
  user: boolean;
  contents: Content[];
}

interface Session {
  sessionId: string;
  sessionState: SessionState;
}

function useLex(props: UseLexProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [waiting, setWaiting] = useState<boolean>(false);

  const lex = new LexRuntimeV2Client({
    region: props.region,
    credentials: fromCognitoIdentityPool({
      identityPoolId: props.identityPoolId,
      clientConfig: { region: props.region },
    }),
  });

  const commonParams = {
    botId: props.botId,
    botAliasId: props.botAliasId,
    localeId: props.localeId,
  };

  const sendText = async (text: string): Promise<void> => {
    const userMessage: Message = {
      user: true,
      contents: [{ content: text, contentType: 'PlainText' }],
    };

    setMessages([...messages, userMessage]);

    setWaiting(true);

    let currentSession: Session;

    if (session === null) {
      const { sessionId } = await lex.send(
        new PutSessionCommand({
          ...commonParams,
          sessionState: {},
          sessionId: generateRandomString(),
        })
      );

      currentSession = { sessionState: {}, sessionId: sessionId! };
    } else {
      currentSession = session;
    }

    setSession(currentSession);

    const res = await lex.send(
      new RecognizeTextCommand({
        ...commonParams,
        sessionState: currentSession.sessionState,
        sessionId: currentSession.sessionId,
        text,
      })
    );

    if (res.sessionState?.dialogAction?.type === 'Close') {
      await lex.send(
        new DeleteSessionCommand({
          ...commonParams,
          sessionId: currentSession.sessionId,
        })
      );

      setSession(null);
    }

    setWaiting(false);

    setMessages([
      ...messages,
      userMessage,
      {
        user: false,
        contents: res.messages!.map((m) => {
          return {
            content: m.content!,
            contentType: m.contentType!,
          };
        }),
      },
    ]);
  };

  const deleteSession = async (): Promise<void> => {
    if (session) {
      await lex.send(
        new DeleteSessionCommand({
          ...commonParams,
          sessionId: session.sessionId,
        })
      );
    }

    setMessages([]);
    setWaiting(false);
    setSession(null);
  };

  return {
    lex,
    sendText,
    deleteSession,
    messages,
    waiting,
    sessionId: session ? session.sessionId : null,
  };
}

export default useLex;
