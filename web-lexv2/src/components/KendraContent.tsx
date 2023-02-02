import React, { useMemo } from 'react';
import { QueryResult, QueryResultItem } from '@aws-sdk/client-kendra';
import Answer from './kendra/Answer';
import QuestionAnswer from './kendra/QuestionAnswer';
import Documents from './kendra/Documents';
import NotFound from './kendra/NotFound';

interface KendraContentProps {
  json: string;
}

function KendraContent(props: KendraContentProps) {
  const { answer, questionAnswer, documents } = useMemo(() => {
    const res: QueryResult = JSON.parse(props.json);
    const items: QueryResultItem[] = res.ResultItems || [];

    const answer = items.find((item) => item.Type === 'ANSWER');
    const questionAnswer = items.find(
      (item) => item.Type === 'QUESTION_ANSWER'
    );
    const documents = items.filter((item) => item.Type === 'DOCUMENT');

    return { answer, questionAnswer, documents };
  }, [props]);

  if (answer) {
    return <Answer item={answer} />;
  } else if (questionAnswer) {
    return <QuestionAnswer item={questionAnswer} />;
  } else if (documents.length > 0) {
    return <Documents items={documents} />;
  } else {
    return <NotFound />;
  }
}

export default KendraContent;
