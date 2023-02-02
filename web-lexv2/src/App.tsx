import React from 'react';
import Lex from './components/Lex';
import './App.css';

function App() {
  const dummyContents = new Array(100).fill(0).map((_, idx) => {
    return (
      <div key={idx} className="text-gray-400">
        Dummy のコンテンツ Dummy のコンテンツ Dummy のコンテンツ Dummy
        のコンテンツ
      </div>
    );
  });

  return (
    <div className="flex flex-col items-center h-screen">
      <h1 className="text-4xl my-6 text-gray-600">LexV2 Chatbot サンプル</h1>

      {dummyContents}

      <Lex />
    </div>
  );
}

export default App;
