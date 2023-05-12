import { SignOut } from '@aws-amplify/ui-react/dist/types/components/Authenticator/Authenticator';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useRef, useState } from 'react';
import { useEffect } from 'react';
import useLoginUser from '../lib/useLoginUser';

type Props = {
  onSignOut: SignOut;
};

// [Auth 拡張実装] 認証時に表示するメニューコンポーネント
const Menu: React.FC<Props> = ({ onSignOut }) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { userGroup } = useLoginUser();

  useEffect(() => {
    // メニューの外側をクリックした際のハンドリング
    const handleClickOutside = (event: any) => {
      // メニューボタンとメニュー以外をクリックしていたらメニューを閉じる
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !buttonRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    // イベントリスナーを設定
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // 後処理でイベントリスナーを削除
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);

  return (
    <div className="absolute top-1 right-1">
      <div className="flex justify-end">
        <button
          ref={buttonRef}
          className="bg-transparent hover:bg-gray-200 border border-grey-400 hover:border-transparent rounded-full p-1"
          onClick={() => {
            setOpen(!open);
          }}
        >
          <FontAwesomeIcon
            className="text-sm text-gray-400 ml-1.5 mr-1.5 mt-1.5 mb-0.5"
            icon={faBars}
          />
        </button>
      </div>

      {open ? (
        <div className="flex" ref={menuRef}>
          <div className="border border-gray-300 bg-white rounded flex flex-col justify-between leading-normal">
            <div className="p-2 text-gray-700">所属グループ:{userGroup}</div>
            <div className="border-b" />
            <div
              className="p-2 hover:bg-gray-200 cursor-pointer text-gray-700"
              onClick={() => {
                onSignOut();
              }}
            >
              サインアウト
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Menu;
