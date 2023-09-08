import axios from 'axios';
import { aws4Interceptor } from 'aws4-axios';
import * as lambda from 'aws-lambda';

const api = axios.create();
api.interceptors.request.use(
  aws4Interceptor({
    options: {
      region: 'us-east-1',
      service: 'bedrock',
    },
  })
);

export const handler = async (
  event: lambda.APIGatewayProxyEvent
): Promise<lambda.APIGatewayProxyResult> => {
  const prompt = JSON.parse(event.body!).prompt;
  const params = JSON.parse(event.body!).params;

  const res = await api.post(
    'https://bedrock.us-east-1.amazonaws.com/model/anthropic.claude-v2/invoke',
    {
      max_tokens_to_sample: 3000,
      temperature: 0.1,
      top_k: 100,
      top_p: 0.6,
      prompt: prompt,
      ...params,
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
