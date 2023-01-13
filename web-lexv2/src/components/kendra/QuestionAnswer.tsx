import React, { useState, useEffect } from 'react';
import { QueryResultItem } from '@aws-sdk/client-kendra';

interface QuestionAnswerProps {
  item: QueryResultItem;
}

function QuestionAnswer(props: QuestionAnswerProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [documentUri, setDocumentUri] = useState('');

  useEffect(() => {
    setQuestion(
      props.item.AdditionalAttributes?.find((a) => a.Key === 'QuestionText')
        ?.Value?.TextWithHighlightsValue?.Text || ''
    );

    setAnswer(
      props.item.AdditionalAttributes?.find((a) => a.Key === 'AnswerText')
        ?.Value?.TextWithHighlightsValue?.Text || ''
    );

    setDocumentUri(props.item.DocumentURI || '');
  }, [props]);

  return (
    <div>
      <div className="text-xs text-gray-500 mb-2">
        よくある質問を見つけました
      </div>
      <div className="text-gray-800">Q. {question}</div>
      <div className="text-gray-800 font-bold">A. {answer}</div>
      <div className="text-xs text-blue-400 flex justify-end mt-2">
        <a href={documentUri} target="_blank" rel="noreferrer">
          {documentUri}
        </a>
      </div>
    </div>
  );
}

export default QuestionAnswer;
