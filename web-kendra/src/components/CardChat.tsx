import React from 'react';
import {
  faCommentDots,
  faRobot,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Role } from '../types/Chat';
import { ReactMarkdown } from 'react-markdown/lib/react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

type Props = {
  className?: string;
  role: Role;
  content: string;
};

const CardChat: React.FC<Props> = (props) => {
  return (
    <div
      className={`border border-gray-400 p-2 rounded text-gray-600 ${
        props.className ?? ''
      }`}
    >
      <div className="font-bold text-gray-800">
        {props.role === 'assistant' && (
          <>
            <FontAwesomeIcon className="text-xl ml-1 mr-2" icon={faRobot} />
            AI アシスタント
          </>
        )}
        {props.role === 'user' && (
          <>
            <FontAwesomeIcon className="text-xl ml-1 mr-2" icon={faUser} />
            あなた
          </>
        )}
      </div>
      <div>
        {props.content.replaceAll('\n', '') !== '' ? (
          <ReactMarkdown
            className="prose max-w-full break-all"
            children={props.content}
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
        ) : (
          <div className="mt-1 ml-1">
            <FontAwesomeIcon
              icon={faCommentDots}
              className="animate-pulse text-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CardChat;
