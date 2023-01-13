import React, { useState, useEffect } from 'react';
import { TextWithHighlights, Highlight } from '@aws-sdk/client-kendra';

interface HighlightTextProps {
  textWithHighlights: TextWithHighlights;
}

function HighlightText(props: HighlightTextProps) {
  const [highlightText, setHighlightText] = useState('');

  useEffect(() => {
    const baseText: string = props.textWithHighlights.Text || '';
    const highlights: Highlight[] = props.textWithHighlights.Highlights || [];

    let tmpHighlightText = '';
    let currentHighlight = 0;

    for (let i = 0; i < baseText.length; i++) {
      if (currentHighlight >= highlights.length) {
        tmpHighlightText += baseText[i];
      } else {
        if (i === highlights[currentHighlight].BeginOffset) {
          tmpHighlightText += '<span class="text-emerald-400 font-bold">';
          tmpHighlightText += baseText[i];
        } else if (i === (highlights[currentHighlight].EndOffset || 0) - 1) {
          tmpHighlightText += baseText[i];
          tmpHighlightText += '</span>';
          currentHighlight += 1;
        } else {
          tmpHighlightText += baseText[i];
        }
      }
    }

    setHighlightText(tmpHighlightText);
  }, [props]);

  return <span dangerouslySetInnerHTML={{ __html: highlightText }} />;
}

export default HighlightText;
