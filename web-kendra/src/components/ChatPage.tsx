import React, { useCallback, useEffect, useState } from 'react';
import CardChat from './CardChat';
import InputChat from './InputChat';
import useRag from '../hooks/useRag';
import useScroll from '../hooks/useScroll';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowsRotate,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

const ChatPage: React.FC = () => {
  const { postMessage, retryPostMessage, messages, loading, hasError } =
    useRag();
  const [content, setContent] = useState('');
  const { scrollToBottom } = useScroll();

  const onSend = useCallback(
    (content: string) => {
      postMessage(content);
      setContent('');
    },
    [postMessage]
  );

  useEffect(() => {
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  return (
    <>
      <div className="w-screen grid grid-cols-10 gap-y-3 mb-32">
        {messages.map((m, idx) => (
          <CardChat
            className="mx-2 col-start-1 col-span-10 md:col-start-2 md:col-span-8 lg:col-start-3 lg:col-span-6"
            key={idx}
            message={m}
          />
        ))}
        {hasError && (
          <div className="col-start-1 col-span-10">
            <div className="flex justify-center flex-col items-center ">
              <div className="font-bold text-red-500">
                <FontAwesomeIcon
                  icon={faTriangleExclamation}
                  className="mr-2"
                />
                回答中にエラーが発生しました。
              </div>
              <button
                className="rounded border px-3 py-2 mt-2 border-gray-400 shadow hover:brightness-50"
                onClick={retryPostMessage}
              >
                <FontAwesomeIcon icon={faArrowsRotate} className="mr-2" />
                再実行
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="fixed bottom-2 w-screen flex justify-center">
        <InputChat
          value={content}
          loading={loading}
          onChange={setContent}
          onSend={onSend}
        />
      </div>
    </>
  );
};

export default ChatPage;
