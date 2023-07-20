import React, { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment } from '@fortawesome/free-solid-svg-icons';
import { QueryResultItem } from '@aws-sdk/client-kendra';
import HighlightText from './HighlightText';

interface TypeAnswerProps {
  item: QueryResultItem;
}

function TypeAnswer(props: TypeAnswerProps) {
  const { answer, answerTextHighlights } = useMemo(() => {
    const answerText = props.item.AdditionalAttributes?.find(
      (a) => a.Key === 'AnswerText'
    );

    const answerOffsets =
      answerText?.Value?.TextWithHighlightsValue?.Highlights?.[0];

    const answer =
      (answerOffsets
        ? answerText?.Value?.TextWithHighlightsValue?.Text?.substring(
            answerOffsets.BeginOffset || 0,
            answerOffsets.EndOffset
          )
        : answerText?.Value?.TextWithHighlightsValue?.Text) || '';

    const answerTextHighlights = answerText?.Value?.TextWithHighlightsValue || {
      Text: '',
      Highlights: [],
    };

    return { answer, answerTextHighlights };
  }, [props]);

  return (
    <div className="p-4 mb-3">
      <div className="text-xs text-gray-400 flex items-center mb-1 ml-1">
        <FontAwesomeIcon
          className="text-xs text-gray-400 mr-2"
          icon={faComment}
        />
        答え
      </div>
      <div className="text-2xl text-gray-800 mb-1">{answer}</div>
      <div className="text-sm">
        <HighlightText textWithHighlights={answerTextHighlights} />
      </div>
    </div>
  );
}

export default TypeAnswer;
