import * as lambda from 'aws-lambda';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

export const handler = async (
  event: lambda.APIGatewayProxyEvent
): Promise<lambda.APIGatewayProxyResult> => {
  const prompt = JSON.parse(event.body!).prompt;
  const params = JSON.parse(event.body!).params;

  const client = new BedrockRuntimeClient({ region: 'ap-northeast-1' });

  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-instant-v1',
    body: JSON.stringify({
      max_tokens_to_sample: 3000,
      temperature: 0.1,
      top_k: 100,
      top_p: 0.6,
      prompt: prompt,
      ...params,
    }),
    contentType: 'application/json',
  });
  const data = await client.send(command);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: data.body.transformToString(),
  };
};
