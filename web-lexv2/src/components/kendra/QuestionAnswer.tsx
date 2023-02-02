import React, { useMemo } from 'react';
import { QueryResultItem } from '@aws-sdk/client-kendra';

interface QuestionAnswerProps {
  item: QueryResultItem;
}

function QuestionAnswer(props: QuestionAnswerProps) {
  const { question, answer, documentUri } = useMemo(() => {
    const question =
      props.item.AdditionalAttributes?.find((a) => a.Key === 'QuestionText')
        ?.Value?.TextWithHighlightsValue?.Text || '';

    const answer =
      props.item.AdditionalAttributes?.find((a) => a.Key === 'AnswerText')
        ?.Value?.TextWithHighlightsValue?.Text || '';

    const documentUri = props.item.DocumentURI || '';

    return { question, answer, documentUri };
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
