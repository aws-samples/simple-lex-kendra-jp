import { Context, Handler } from 'aws-lambda';
import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';

declare global {
  namespace awslambda {
    function streamifyResponse(
      f: (
        event: {
          prompt: string;
          params?: {
            max_tokens_to_sample?: number;
            temperature?: number;
            top_k?: number;
            top_p?: number;
          };
        },
        responseStream: NodeJS.WritableStream,
        context: Context
      ) => Promise<void>
    ): Handler;
  }
}

export const handler = awslambda.streamifyResponse(
  async (event, responseStream, context) => {
    const client = new BedrockRuntimeClient({ region: 'ap-northeast-1' });
    const command = new InvokeModelWithResponseStreamCommand({
      modelId: 'anthropic.claude-instant-v1',
      body: JSON.stringify({
        max_tokens_to_sample: 3000,
        temperature: 0.7,
        top_k: 100,
        top_p: 0.6,
        prompt: event.prompt,
        ...event.params,
      }),
      contentType: 'application/json',
    });

    const res = await client.send(command);

    if (!res.body) {
      responseStream.end();
      return;
    }

    for await (const streamChunk of res.body) {
      if (!streamChunk.chunk?.bytes) {
        break;
      }
      const body = JSON.parse(
        new TextDecoder('utf-8').decode(streamChunk.chunk?.bytes)
      );
      if (body.completion) {
        responseStream.write(body.completion);
      }
      if (body.stop_reason) {
        break;
      }
    }

    responseStream.end();
  }
);
