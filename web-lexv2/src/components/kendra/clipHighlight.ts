import { TextWithHighlights } from '@aws-sdk/client-kendra';

const clipHighlight = (highlightText: TextWithHighlights): string => {
  const baseText = highlightText.Text || '';
  const highlights = highlightText.Highlights || [];

  if (highlights.length === 0) {
    return baseText;
  } else {
    return baseText.slice(highlights[0].BeginOffset, highlights[0].EndOffset);
  }
};

export default clipHighlight;
