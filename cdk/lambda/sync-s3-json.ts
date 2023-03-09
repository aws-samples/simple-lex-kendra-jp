import {
  KendraClient,
  StartDataSourceSyncJobCommand,
  StopDataSourceSyncJobCommand,
  BatchPutDocumentCommand,
} from '@aws-sdk/client-kendra';
import {
  S3Event,
} from 'aws-lambda';
import {
  S3Client,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

const INDEX_ID = process.env.INDEX_ID;
const DATA_SOURCE_ID = process.env.DATA_SOURCE_ID;
const BUCKET = process.env.BUCKET;

interface SyncS3JsonProps {}

exports.handler = async (event: S3Event): Promise<void> => {
  const key = event.Records[0].s3.object.key;
  const s3 = new S3Client({});
  const getObjectCommand = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  const data = await s3.send(getObjectCommand);
  const json = JSON.parse(await data.Body?.transformToString() || '[]');
  console.log(json);

  // const kendra = new KendraClient({});
  // const startDataSourceSyncJobCommand = new StartDataSourceSyncJobCommand({
  //   Id: DATA_SOURCE_ID,
  //   IndexId: INDEX_ID,
  // });
  //
  // const startDataSourceSyncJobRes = await kendra.send(
  //   startDataSourceSyncJobCommand
  // );
  // const executionId = startDataSourceSyncJobRes.ExecutionId;
}
