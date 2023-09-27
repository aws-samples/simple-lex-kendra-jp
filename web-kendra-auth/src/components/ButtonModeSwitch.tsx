import {
  faComments,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';

type Props = {
  className?: string;
  chatMode: boolean;
  onClick: (chatMode: boolean) => void;
};

const ButtonModeSwitch: React.FC<Props> = (props) => {
  return (
    <div className={`${props.className} text-gray-800`}>
      <button
        className="bg-transparent p-2 rounded border-gray-400 border shadow-md hover:brightness-50"
        onClick={() => {
          props.onClick(!props.chatMode);
        }}
      >
        <FontAwesomeIcon
          className="text mr-2 ml-2 cursor-pointer"
          icon={props.chatMode ? faMagnifyingGlass : faComments}
        />
        {props.chatMode ? '検索画面へ戻る' : 'チャット形式で質問'}
      </button>
    </div>
  );
};

export default ButtonModeSwitch;
