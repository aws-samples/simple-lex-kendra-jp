import {
  faArrowRotateLeft,
  faPaperPlane,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import useRag from '../hooks/useRag';

const MAX_HEIGHT = 300;

type Props = {
  value: string;
  loading?: boolean;
  onChange: (value: string) => void;
  onSend: (value: string) => void;
};

const InputChat: React.FC<Props> = (props) => {
  const { messages, clearMessages } = useRag();

  const ref = useRef<HTMLTextAreaElement>(null);
  const [isMax, setIsMax] = useState(false);

  const disabledSend = useMemo<boolean>(() => {
    return props.loading || props.value === '';
  }, [props.loading, props.value]);

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    ref.current.style.height = 'auto';

    if (ref.current.scrollHeight > MAX_HEIGHT) {
      ref.current.style.height = MAX_HEIGHT + 'px';
      setIsMax(true);
    } else {
      ref.current.style.height = ref.current.scrollHeight + 'px';
      setIsMax(false);
    }
  }, [props.value]);

  useEffect(() => {
    const listener = (e: DocumentEventMap['keypress']) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();

        if (!disabledSend) {
          props.onSend(props.value);
        }
      }
    };
    const refCurrent = ref.current;
    refCurrent?.addEventListener('keypress', listener);

    return () => {
      refCurrent?.removeEventListener('keypress', listener);
    };
  }, [disabledSend, props, ref]);

  const isEmpty = useMemo(() => {
    return props.value === '';
  }, [props.value]);

  return (
    <div className="relative sm:w-11/12 md:w-10/12 lg:w-4/6 xl:w-3/6">
      <div className="mb-2 flex p-2 items-end rounded-xl border bg-white border-gray-400 shadow-[0_0_10px_3px] shadow-gray-400/40 ">
        <textarea
          ref={ref}
          className={`w-full resize-none rounded p-1.5 outline-none bg-transparent ${
            isMax ? 'overflow-y-auto' : 'overflow-hidden'
          } border-0 focus:ring-0 `}
          rows={1}
          value={props.value}
          placeholder="チャット形式でドキュメントを検索できます"
          onChange={(e) => {
            props.onChange(e.target.value);
          }}
        />
        <button
          className={`${
            isEmpty ? 'text-gray-300 border' : 'border bg-blue-500 text-white'
          } rounded-lg p-2 flex text-xl justify-center items-center`}
          disabled={disabledSend}
          onClick={() => {
            props.onSend(props.value);
          }}
        >
          {props.loading ? (
            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
          ) : (
            <FontAwesomeIcon icon={faPaperPlane} />
          )}
        </button>
      </div>
      {messages.length > 0 && (
        <div className="absolute -top-14 right-0 ">
          <button
            className={`border  px-3 py-2 rounded  shadow bg-white ${
              props.loading ? 'text-gray-300' : 'text-gray-700 border-gray-400'
            }`}
            disabled={props.loading}
            onClick={clearMessages}
          >
            <FontAwesomeIcon icon={faArrowRotateLeft} className="mr-1" />
            会話のクリア
          </button>
        </div>
      )}
    </div>
  );
};

export default InputChat;
