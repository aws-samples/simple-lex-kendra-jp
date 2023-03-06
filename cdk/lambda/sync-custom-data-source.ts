import {
  KendraClient,
  StartDataSourceSyncJobCommand,
  StopDataSourceSyncJobCommand,
  BatchPutDocumentCommand,
} from '@aws-sdk/client-kendra';

const INDEX_ID = process.env.INDEX_ID;
const DATA_SOURCE_ID = process.env.DATA_SOURCE_ID;

const demoDocuments = [
  {
    id: 'shainshokudo',
    title: '社員食堂の利用について',
    content:
      '社員食堂は本社ビルの17階にあります。社員証で決算を行います。費用は給与から天引きされます。ランチはAランチとBランチの2種類があります。価格は500円です。',
    url: 'https://shainshokudo.xxxx',
  },
];

interface SyncCustomDataSourceProps {}

exports.handler = async (_props: SyncCustomDataSourceProps): Promise<void> => {
  const kendra = new KendraClient({});
  const startDataSourceSyncJobCommand = new StartDataSourceSyncJobCommand({
    Id: DATA_SOURCE_ID,
    IndexId: INDEX_ID,
  });

  const startDataSourceSyncJobRes = await kendra.send(
    startDataSourceSyncJobCommand
  );
  const executionId = startDataSourceSyncJobRes.ExecutionId;
  const documents = demoDocuments.map((d) => {
    return {
      Id: d.id,
      Title: d.title,
      Blob: new TextEncoder().encode(d.content),
      ContentType: 'PLAIN_TEXT', // Web コンテンツなら HTML のままの方がベター (汎用的な例として PLAIN_TEXT を採用)
      Attributes: [
        {
          Key: '_data_source_id',
          Value: {
            StringValue: DATA_SOURCE_ID,
          },
        },
        {
          Key: '_data_source_sync_job_execution_id',
          Value: {
            StringValue: executionId,
          },
        },
        {
          Key: '_source_uri',
          Value: {
            StringValue: d.url,
          },
        },
      ],
    };
  });
  const batchPutDocumentCommand = new BatchPutDocumentCommand({
    IndexId: INDEX_ID,
    RoleArn: undefined,
    Documents: documents,
    CustomDocumentEnrichmentConfiguration: undefined,
  });
  await kendra.send(batchPutDocumentCommand);

  const stopDataSourceSyncJobCommand = new StopDataSourceSyncJobCommand({
    Id: DATA_SOURCE_ID,
    IndexId: INDEX_ID,
  });
  await kendra.send(stopDataSourceSyncJobCommand);
};
