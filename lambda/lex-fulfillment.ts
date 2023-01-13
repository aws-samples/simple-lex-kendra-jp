import * as lambda from 'aws-lambda';
import { LexV2Result } from 'aws-lambda';
import { KendraClient, QueryCommand } from '@aws-sdk/client-kendra';

const INDEX_ID = process.env.INDEX_ID;
const REGION = process.env.REGION;

const queryKendra = async (query: string): Promise<string> => {
  const kendra = new KendraClient({
    region: REGION,
  });

  const queryCommand = new QueryCommand({
    IndexId: INDEX_ID,
    QueryText: query,
    AttributeFilter: {
      EqualsTo: {
        Key: '_language_code',
        Value: {
          StringValue: 'ja',
        },
      },
    },
  });

  const queryRes = await kendra.send(queryCommand);

  if (queryRes.$metadata.httpStatusCode === 200) {
    return JSON.stringify(queryRes);
  } else {
    throw new Error((queryRes as any).message!);
  }
};

exports.handler = async (
  event: lambda.LexV2Event
): Promise<lambda.LexV2Result> => {
  const sessionState = event.sessionState;

  let content: string;
  let contentType: string;

  try {
    switch (sessionState.intent.name) {
      case 'FallbackIntent':
        content = await queryKendra(event.inputTranscript);
        contentType = 'CustomPayload';
        break;
      case 'PCReplacementIntent':
        content = '申請が完了しました。';
        contentType = 'PlainText';
        break;
      default:
        content = '未対応のリクエストです (エラー)';
        contentType = 'PlainText';
        break;
    }
  } catch (e) {
    console.error(e);
    content = 'エラーが発生しました';
    contentType = 'PlainText';
  }

  sessionState.intent.state = 'Fulfilled';
  sessionState.dialogAction = { type: 'Close' };

  const messages = [
    {
      contentType,
      content,
    },
  ];

  const response = {
    sessionState,
    messages,
  } as LexV2Result;

  return response;
};
