import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useMemo, useRef, useState } from 'react';

const MAX_HEIGHT = 300;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: (value: string) => void;
};

const InputChat: React.FC<Props> = (props) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [isMax, setIsMax] = useState(false);

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

        props.onSend(props.value);

        // if (!disabledSend) {
        //   props.onSend();
        // }
      }
    };
    const refCurrent = ref.current;
    refCurrent?.addEventListener('keypress', listener);

    return () => {
      refCurrent?.removeEventListener('keypress', listener);
    };
  }, [props, ref]);

  const isEmpty = useMemo(() => {
    return props.value === '';
  }, [props.value]);

  return (
    <div className="mb-2 flex p-2 items-end rounded-xl border bg-white border-gray-400 shadow-[0_0_10px_3px] shadow-gray-400/40 md:w-10/12 lg:w-4/6 xl:w-3/6">
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
          isEmpty ? 'text-gray-300' : 'border bg-blue-500 text-white'
        } rounded-lg p-2 flex text-xl justify-center items-center`}
      >
        <FontAwesomeIcon icon={faPaperPlane} />
      </button>
    </div>
  );
};

export default InputChat;
