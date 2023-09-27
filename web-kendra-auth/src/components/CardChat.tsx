import React, { useMemo } from 'react';
import {
  faRobot,
  faSpinner,
  faTriangleExclamation,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Message } from '../types/Chat';
import { ReactMarkdown } from 'react-markdown/lib/react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ChatReferenceDoc from './ChatReferenceDoc';

type Props = {
  className?: string;
  message: Message;
};

const CardChat: React.FC<Props> = (props) => {
  const message = useMemo(() => props.message, [props.message]);

  return (
    <div
      className={`border border-gray-400 p-2 rounded text-gray-600 ${
        message.role === 'user' ? 'bg-gray-200/30' : ''
      } ${props.className ?? ''}`}
    >
      <div className="font-bold text-gray-800">
        {message.role === 'assistant' && (
          <>
            <FontAwesomeIcon className="text-xl ml-1 mr-2" icon={faRobot} />
            AI アシスタント
          </>
        )}
        {message.role === 'user' && (
          <>
            <FontAwesomeIcon className="text-xl ml-1 mr-2" icon={faUser} />
            あなた
          </>
        )}
      </div>
      <div>
        {message.content.replaceAll('\n', '') !== '' ? (
          <>
            <ReactMarkdown
              className="prose max-w-full break-all"
              children={message.content}
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      {...props}
                      children={String(children).replace(/\n$/, '')}
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                    />
                  ) : (
                    <code {...props} className={className}>
                      {children}
                    </code>
                  );
                },
              }}
            />
            {(message.references || message.loadingReference) && (
              <div className="mt-1 py-2 border-t">
                <div className="font-semibold italic text-sm text-gray-500">
                  参考ドキュメント
                </div>
                <div className="ml-3 mt-1">
                  {message.loadingReference && (
                    <div className="flex">
                      <FontAwesomeIcon
                        icon={faSpinner}
                        className="animate-spin text-gray-400"
                      />
                    </div>
                  )}
                  {message.references &&
                    message.references.map((reference, idx) => (
                      <ChatReferenceDoc
                        key={idx}
                        className="mb-1"
                        {...reference}
                      />
                    ))}
                  {message.references?.length === 0 && (
                    <div className="text-sm font-bold">
                      <FontAwesomeIcon
                        icon={faTriangleExclamation}
                        className="mr-2"
                      />
                      Kendra
                      から参照可能な関連ドキュメントがございませんでした。回答の正確性にご留意ください。
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="mt-1 ml-1 animate-pulse">▍</div>
        )}
      </div>
    </div>
  );
};

export default CardChat;
