import React, { useCallback, useState } from 'react';
import CardChat from './CardChat';
import InputChat from './InputChat';
import useRag from '../hooks/useRag';

const ChatPage: React.FC = () => {
  const { postMessage, messages, loading } = useRag();
  const [content, setContent] = useState('');

  const onSend = useCallback(
    (content: string) => {
      setContent('');

      postMessage(content);
    },
    [postMessage]
  );

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
