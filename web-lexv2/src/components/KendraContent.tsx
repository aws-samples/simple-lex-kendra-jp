import React, { useState, useEffect } from 'react';
import { QueryResult, QueryResultItem } from '@aws-sdk/client-kendra';
import Answer from './kendra/Answer';
import QuestionAnswer from './kendra/QuestionAnswer';
import Documents from './kendra/Documents';
import NotFound from './kendra/NotFound';

interface KendraContentProps {
  json: string;
}

function KendraContent(props: KendraContentProps) {
  const [element, setElement] = useState<JSX.Element>(<></>);

  useEffect(() => {
    const res: QueryResult = JSON.parse(props.json);
    const items: QueryResultItem[] = res.ResultItems || [];

    const answer = items.find((item) => item.Type === 'ANSWER');
    const questionAnswer = items.find(
      (item) => item.Type === 'QUESTION_ANSWER'
    );
    const documents = items.filter((item) => item.Type === 'DOCUMENT');

    if (answer) {
      setElement(<Answer item={answer} />);
    } else if (questionAnswer) {
      setElement(<QuestionAnswer item={questionAnswer} />);
    } else if (documents.length > 0) {
      setElement(<Documents items={documents} />);
    } else {
      setElement(<NotFound />);
    }
  }, [props]);

  return <>{element}</>;
}

export default KendraContent;
