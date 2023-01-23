import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faXmark,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import TypeDocument from './TypeDocument';
import TypeAnswer from './TypeAnswer';
import TypeQuestionAnswer from './TypeQuestionAnswer';
import TypeNotFound from './TypeNotFound';
import { QueryResultItem } from '@aws-sdk/client-kendra';
import { sendQuery } from '../lib/fetcher';
import { useForm } from 'react-hook-form';
import './ItemList.css';

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT!;

interface Query {
  query: string;
}

function ItemList() {
  const [items, setItems] = useState<QueryResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [queryOnce, setQueryOnce] = useState(false);

  const {
    register,
    watch,
    handleSubmit,
    setValue,
  } = useForm<Query>();

  const watchQuery = watch('query', '');

  const onSubmit = async (data: Query) => {
    if (data.query.length === 0) return;

    setQueryOnce(true);
    setLoading(true);
    setItems([]);
    const items = await sendQuery(API_ENDPOINT, data.query);
    setItems(items);
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-4xl my-6 text-gray-600">Kendra 検索サンプル</h1>

      <form
        className="flex items-center border border-gray-400 rounded-full py-2 px-2 w-1/2 mb-8"
        onSubmit={handleSubmit(onSubmit)}
      >
        <FontAwesomeIcon
          className="text-sm text-gray-400 ml-1 mr-2"
          icon={faSearch}
        />
        <input
          className="focus:outline-none w-full"
          type="text"
          {...register("query")}
        />

        {watchQuery.length > 0 && (
          <FontAwesomeIcon
            className="text-sm text-gray-400 mr-1 ml-2 cursor-pointer"
            icon={faXmark}
            onClick={() => {
              setValue('query', '');
            }}
          />
        )}
      </form>

      <div className="w-full border border-b-0 border-gray-400 mb-4" />

      {queryOnce && !loading && items.length === 0 && <TypeNotFound/>}

      {loading && <div>
        <FontAwesomeIcon
          className="text-xl text-gray-400 rotate mt-4"
          icon={faSpinner}
        />
      </div>}

      {!loading && items.map((item: QueryResultItem) => {
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
      })}
    </div>
  );
}

export default ItemList;
