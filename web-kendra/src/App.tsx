import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faXmark,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import TypeDocument from './components/TypeDocument';
import TypeAnswer from './components/TypeAnswer';
import TypeQuestionAnswer from './components/TypeQuestionAnswer';
import TypeNotFound from './components/TypeNotFound';
import { QueryResultItem } from '@aws-sdk/client-kendra';
import './App.css';

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT!;

function App() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<QueryResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [queryOnce, setQueryOnce] = useState(false);

  const handleChangeQuery = (event: any) => {
    setQuery(event.target.value);
  };

  const handleSubmit = async (event: any) => {
    event.preventDefault();

    if (query.length === 0) {
      return;
    }

    setItems([]);
    setLoading(true);
    setQueryOnce(true);

    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
      }),
    });

    const items = (await res.json()).ResultItems;

    setItems(items);
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-4xl my-6 text-gray-600">Kendra 検索サンプル</h1>

      <form
        className="flex items-center border border-gray-400 rounded-full py-2 px-2 w-1/2 mb-8"
        onSubmit={handleSubmit}
      >
        <FontAwesomeIcon
          className="text-sm text-gray-400 ml-1 mr-2"
          icon={faSearch}
        />
        <input
          className="focus:outline-none w-full"
          type="text"
          onChange={handleChangeQuery}
          value={query}
        />

        {query.length > 0 && (
          <FontAwesomeIcon
            className="text-sm text-gray-400 mr-1 ml-2 cursor-pointer"
            icon={faXmark}
            onClick={() => {
              setQuery('');
            }}
          />
        )}
      </form>

      <div className="w-full border border-b-0 border-gray-400 mb-4" />

      {loading ? (
        <div>
          <FontAwesomeIcon
            className="text-xl text-gray-400 rotate mt-4"
            icon={faSpinner}
          />
        </div>
      ) : items.length > 0 ? (
        items.map((item: QueryResultItem) => {
          switch (item.Type) {
            case 'DOCUMENT':
              return <TypeDocument item={item} key={item.Id} />;
            case 'ANSWER':
              return <TypeAnswer item={item} key={item.Id} />;
            case 'QUESTION_ANSWER':
              return <TypeQuestionAnswer item={item} key={item.Id} />;
            default:
              return <>Unknown Type: {item.Type}</>;
          }
        })
      ) : (
        queryOnce && <TypeNotFound />
      )}
    </div>
  );
}

export default App;
