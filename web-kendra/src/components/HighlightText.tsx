import React, { useMemo } from 'react';
import { TextWithHighlights, Highlight } from '@aws-sdk/client-kendra';

interface HighlightTextProps {
  textWithHighlights: TextWithHighlights;
}

function HighlightText(props: HighlightTextProps) {
  const highlightText = useMemo(() => {
    const baseText: string = props.textWithHighlights.Text || '';
    const highlights: Highlight[] = props.textWithHighlights.Highlights || [];

    let highlightText = '';
    let currentHighlight = 0;

    for (let i = 0; i < baseText.length; i++) {
      if (currentHighlight >= highlights.length) {
        highlightText += baseText[i];
      } else {
        if (i === highlights[currentHighlight].BeginOffset) {
          highlightText += '<span class="text-emerald-400 font-bold">';
          highlightText += baseText[i];
        } else if (i === (highlights[currentHighlight].EndOffset || 0) - 1) {
          highlightText += baseText[i];
          highlightText += '</span>';
          currentHighlight += 1;
        } else {
          highlightText += baseText[i];
        }
      }
    }

    return highlightText;
  }, [props]);

  return <span dangerouslySetInnerHTML={{ __html: highlightText }} />;
}

export default HighlightText;
