import React from 'react';
import { QueryResultItem } from '@aws-sdk/client-kendra';
import clipHighlight from './clipHighlight';

interface AnswerProps {
  item: QueryResultItem;
}

function Answer(props: AnswerProps) {
  const highlight = clipHighlight(
    props.item.AdditionalAttributes?.find((a) => a.Key === 'AnswerText')?.Value
      ?.TextWithHighlightsValue || { Text: '', Highlights: [] }
  );

  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">答えの候補を見つけました</div>
      {highlight}
    </div>
  );
}

export default Answer;
