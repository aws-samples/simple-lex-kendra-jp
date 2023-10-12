import React from 'react';

function TypeNotFound() {
  return (
    <div className="text-gray-600 p-4">
      <div className="text-md mb-8">見つかりませんでした</div>
      <div className="text-md mb-2">
        ヒント: 単語にスペースを入れて検索してみてください
      </div>
      <div className="text-md">
        前: <span className="font-bold">「鈴木はどこに住んでいますか」</span>
      </div>
      <div className="text-md">
        後: <span className="font-bold">「鈴木 どこ 住んでいる」</span>
      </div>
    </div>
  );
}

export default TypeNotFound;
