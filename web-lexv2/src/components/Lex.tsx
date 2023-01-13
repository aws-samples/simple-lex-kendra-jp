import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeadset,
  faXmark,
  faMicrophone,
  faMicrophoneSlash,
  faPaperPlane,
  faComment,
} from '@fortawesome/free-solid-svg-icons';
import useLex, { Message, Content } from '../hooks/useLex';
import useTranscribeStreaming, {
  TranscribeHandlerProps,
} from '../hooks/useTranscribeStreaming';
import KendraContent from './KendraContent';
import './Lex.css';

const BOT_ID = process.env.REACT_APP_BOT_ID!;
const BOT_ALIAS_ID = process.env.REACT_APP_BOT_ALIAS_ID!;
const IDENTITY_POOL_ID = process.env.REACT_APP_IDENTITY_POOL_ID!;
const REGION = process.env.REACT_APP_REGION!;

function Lex() {
  const [expanded, setExpanded] = useState(false);
  const [messagesBox, setMessagesBox] = useState<JSX.Element[]>([]);
  const [text, setText] = useState('');
  const [transcripts, setTranscripts] = useState<TranscribeHandlerProps[]>([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [deletingSession, setDeletingSession] = useState(false);

  const { sendText, deleteSession, messages, waiting, sessionId } = useLex({
    botId: BOT_ID,
    botAliasId: BOT_ALIAS_ID,
    localeId: 'ja_JP',
    identityPoolId: IDENTITY_POOL_ID,
    region: REGION,
  });

  const transcriptsHandler = async (transcripts: TranscribeHandlerProps[]) => {
    setTranscripts(transcripts);
  };

  const { recording, startRecording, stopRecording } = useTranscribeStreaming({
    languageCode: 'ja-JP',
    identityPoolId: IDENTITY_POOL_ID,
    region: REGION,
    transcriptsHandler,
  });

  useEffect(() => {
    (async () => {
      for (const t of transcripts) {
        if (!t.isPartial) {
          await sendText(t.transcripts.join(' '));
        }
      }
    })();
    // eslint-disable-next-line
  }, [transcripts]);

  // eslint-disable-next-line
  useEffect(() => {
    if (!sessionStarted && sessionId !== null) {
      setSessionStarted(true);
    }

    if (sessionStarted && sessionId === null) {
      setSessionStarted(false);

      if (recording) {
        stopRecording();
      }
    }
  });

  const handleSubmit = async (event: any) => {
    event.preventDefault();

    if (text.length === 0) {
      return;
    }

    setText('');

    await sendText(text);
  };

  const handleChangeText = (event: any) => {
    setText(event.target.value);
  };

  const expandButton = (
    <div
      className="bg-blue-400 rounded-full flex items-center justify-center w-16 h-16 shadow-lg cursor-pointer"
      onClick={() => setExpanded(true)}
    >
      <FontAwesomeIcon className="text-white text-lg" icon={faHeadset} />
    </div>
  );

  const messageBoxUser = (message: Message, idx: number) => {
    return message.contents.map((c: Content, j: number) => {
      return (
        <div
          key={idx + '' + j}
          className="flex items-center justify-end w-full mb-3 break-all"
        >
          <div className="bg-blue-400 text-white border border-blue-200 max-w-[70%] p-3 text-sm rounded-lg shadow-lg">
            {c.content}
          </div>
        </div>
      );
    });
  };

  const messageBoxChatbot = (message: Message, idx: number) => {
    return message.contents.map((c: Content, j: number) => {
      return (
        <div
          key={idx + '' + j}
          className="flex items-center justify-start w-full mb-3 break-all"
        >
          <div className="bg-gray-200 text-black border border-gray-400 max-w-[70%] p-3 text-sm rounded-lg shadow-lg">
            {c.contentType === 'PlainText' ? (
              <span>{c.content}</span>
            ) : (
              <KendraContent json={c.content} />
            )}
          </div>
        </div>
      );
    });
  };

  const messageBox = (message: Message, idx: number) => {
    return message.user
      ? messageBoxUser(message, idx)
      : messageBoxChatbot(message, idx);
  };

  useEffect(() => {
    const newMessagesBox = messages
      .map((m: Message, idx: number) => messageBox(m, idx))
      .flat();
    setMessagesBox(newMessagesBox);
    // eslint-disable-next-line
  }, [messages]);

  const messagesBottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => {
      if (messagesBottom.current) {
        messagesBottom.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }, [messagesBox]);

  const closeChatWindow = async (): Promise<void> => {
    setDeletingSession(true);
    await deleteSession();
    setExpanded(false);
    setDeletingSession(false);
  };

  const chatWindow = (
    <div className="flex-1 flex flex-col w-[32rem] bg-white border border-gray-400 shadow-lg z-10">
      <div className="h-16 text-white bg-blue-400 flex items-center justify-center">
        <span className="font-bold">CHATBOT</span>
        <button
          className="absolute right-2 hover:bg-blue-500 rounded-full w-8 h-8 flex items-center justify-center"
          onClick={closeChatWindow}
        >
          <FontAwesomeIcon className="text-white" icon={faXmark} />
        </button>
      </div>

      <div className="flex flex-col p-3 overflow-y-auto scrolling-touch h-[32rem]">
        {messagesBox}
        {waiting && (
          <div className="w-full flex justify-start pl-2">
            <FontAwesomeIcon className="blink text-lg" icon={faComment} />
          </div>
        )}
        <div ref={messagesBottom} />
      </div>

      <div className="h-16 border-t border-gray-400 flex flex-row items-center w-full">
        {recording ? (
          <button
            className="w-10 h-10 rounded-full bg-red-400 hover:bg-red-500 ml-4 mr-2"
            onClick={stopRecording}
          >
            <FontAwesomeIcon className="text-white" icon={faMicrophoneSlash} />
          </button>
        ) : (
          <button
            className="w-10 h-10 rounded-full bg-blue-400 hover:bg-blue-500 ml-4 mr-2"
            onClick={startRecording}
          >
            <FontAwesomeIcon className="text-white" icon={faMicrophone} />
          </button>
        )}

        <form
          className="grow flex flex-row items-center"
          onSubmit={handleSubmit}
        >
          <input
            className="grow h-10 rounded-tl-md rounded-bl-md border-t border-l border-b border-gray-400 px-2 focus:outline-none"
            type="text"
            onChange={handleChangeText}
            value={text}
          />
          <button
            className="bg-blue-400 hover:bg-blue-500 h-10 rounded-tr-md rounded-br-md border mr-4 px-4 border-gray-400"
            type="submit"
          >
            <FontAwesomeIcon className="text-white" icon={faPaperPlane} />
          </button>
        </form>
      </div>

      {waiting}
    </div>
  );

  return (
    <div className="fixed bottom-8 right-8">
      {expanded ? chatWindow : expandButton}

      {expanded && deletingSession && (
        <div className="absolute top-0 right-0 left-0 bottom-0 bg-gray-600/[0.8] flex items-center justify-center">
          <span className="text-white font-bold">
            CHATBOT を終了しています...
          </span>
        </div>
      )}
    </div>
  );
}

export default Lex;
