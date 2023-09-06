import axios from 'axios';
import { aws4Interceptor } from 'aws4-axios';
import { IncomingMessage } from 'http';
import { EventStreamCodec } from '@smithy/eventstream-codec';
import { fromUtf8, toUtf8 } from '@smithy/util-utf8';
import { Context, Handler } from 'aws-lambda';

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

export const handler = awslambda.streamifyResponse(
  async (event, responseStream, context) => {
    const res = await api.post(
      'https://bedrock.us-east-1.amazonaws.com/model/anthropic.claude-v2/invoke-with-response-stream',
      {
        max_tokens_to_sample: 3000,
        temperature: 0.7,
        top_k: 100,
        top_p: 0.6,
        prompt: event.prompt,
        ...event.params,
      },
      {
        headers: {
          Accept: '*/*',
          'Content-Type': 'application/json',
          'X-Amzn-Bedrock-Save': 1, // true | false
        },
        responseType: 'stream',
      }
    );

    const stream: IncomingMessage = res.data;
    for await (const chunk of stream) {
      const event = new EventStreamCodec(toUtf8, fromUtf8).decode(chunk);
      if (
        event.headers[':event-type'].value !== 'chunk' ||
        event.headers[':content-type'].value !== 'application/json'
      ) {
        throw Error(`Failed to get event chunk: got ${chunk}`);
      }
      const body = JSON.parse(
        Buffer.from(
          JSON.parse(new TextDecoder('utf-8').decode(event.body)).bytes,
          'base64'
        ).toString()
      );
      // console.log(body);
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
