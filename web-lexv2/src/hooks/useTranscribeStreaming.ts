import { useState } from 'react';
import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
} from '@aws-sdk/client-transcribe-streaming';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import MicrophoneStream from 'microphone-stream';
import { Readable } from 'readable-stream';
import { PassThrough } from 'stream-browserify';
import { Buffer } from 'buffer';
import * as process from 'process';

window.process = process;
window.Buffer = Buffer;

export interface Transcripts {
  isPartial: boolean;
  transcripts: string[];
}

interface UseTranscribeStreamingProps {
  languageCode: string;
  identityPoolId: string;
  region: string;
}

function useTranscribeStreaming(props: UseTranscribeStreamingProps) {
  const [transcripts, setTranscripts] = useState<Transcripts[]>([]);
  const [recording, setRecording] = useState(false);
  const [micStream, setMicStream] = useState<MicrophoneStream | null>(null);

  const client = new TranscribeStreamingClient({
    region: props.region,
    credentials: fromCognitoIdentityPool({
      identityPoolId: props.identityPoolId,
      clientConfig: { region: props.region },
    }),
  });

  const stopRecording = () => {
    if (micStream) {
      micStream.stop();
    }

    setMicStream(null);
    setRecording(false);
  };

  const startRecording = async () => {
    try {
      const micStream = new MicrophoneStream();

      setRecording(true);
      setMicStream(micStream);

      const pcmEncodeChunk = (chunk: Buffer) => {
        const input = MicrophoneStream.toRaw(chunk);
        var offset = 0;
        var buffer = new ArrayBuffer(input.length * 2);
        var view = new DataView(buffer);
        for (var i = 0; i < input.length; i++, offset += 2) {
          var s = Math.max(-1, Math.min(1, input[i]));
          view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
        return Buffer.from(buffer);
      };

      const audioPayloadStream = new PassThrough({ highWaterMark: 1 * 1024 });

      micStream.setStream(
        await window.navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        })
      );

      (micStream as Readable).pipe(audioPayloadStream);

      const audioStream = async function* () {
        for await (const chunk of audioPayloadStream) {
          yield { AudioEvent: { AudioChunk: pcmEncodeChunk(chunk) } };
        }
      };

      const command = new StartStreamTranscriptionCommand({
        LanguageCode: props.languageCode,
        MediaEncoding: 'pcm',
        MediaSampleRateHertz: 44100,
        AudioStream: audioStream(),
      });

      const response = await client.send(command);

      for await (const event of response.TranscriptResultStream!) {
        if (event.TranscriptEvent) {
          const results = event!.TranscriptEvent!.Transcript!.Results!.map(
            (r) => {
              return {
                isPartial: r.IsPartial!,
                transcripts: r.Alternatives!.map((a) => a.Transcript!),
              };
            }
          );

          if (results.length > 0) {
            setTranscripts(results);
          }
        }
      }
    } catch (e) {
      console.error(e);
      stopRecording();
    }
  };

  return {
    transcripts,
    recording,
    startRecording,
    stopRecording,
  };
}

export default useTranscribeStreaming;
