import React, { useCallback, useState } from 'react';
import CardChat from './CardChat';
import InputChat from './InputChat';
import useRag from '../hooks/useRag';

const ChatPage: React.FC = () => {
  const { predict, messages } = useRag();
  const [content, setContent] = useState('');

  const onSend = useCallback(
    (content: string) => {
      setContent('');

      predict(content);
    },
    [predict]
  );

  return (
    <>
      <div className="w-screen grid grid-cols-10 gap-3 mb-32">
        {messages.map((m, idx) => (
          <CardChat className="col-start-3 col-span-6" key={idx} {...m} />
        ))}
      </div>
      <div className="fixed bottom-2 w-screen flex justify-center">
        <InputChat value={content} onChange={setContent} onSend={onSend} />
      </div>
    </>
  );
};

export default ChatPage;
