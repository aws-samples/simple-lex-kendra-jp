import axios from 'axios';
import { aws4Interceptor } from 'aws4-axios';
import { IncomingMessage } from 'http';
import { EventStreamCodec } from '@smithy/eventstream-codec';
import { fromUtf8, toUtf8 } from '@smithy/util-utf8';
import * as lambda from 'aws-lambda';

const api = axios.create();
api.interceptors.request.use(
  aws4Interceptor({
    options: {
      region: 'us-east-1',
      service: 'bedrock',
      assumeRoleArn: 'arn:aws:iam::936931980683:role/BedrockRole4RP',
    },
  })
);

export const handler = async (
  event: lambda.APIGatewayProxyEvent
): Promise<lambda.APIGatewayProxyResult> => {
  const prompt = JSON.parse(event.body!).prompt;

  const res = await api.post(
    'https://bedrock.us-east-1.amazonaws.com/model/anthropic.claude-v2/invoke',
    {
      max_tokens_to_sample: 3000,
      temperature: 0.0,
      top_k: 250,
      top_p: 0.999,
      stop_sequences: [],
      prompt: prompt,
    },
    {
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json',
        'X-Amzn-Bedrock-Save': 1, // true | false
      },
    }
  );
  return {
    statusCode: res.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(res.data),
  };
};
