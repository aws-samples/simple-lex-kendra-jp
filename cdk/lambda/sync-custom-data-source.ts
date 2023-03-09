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
    id: 'amazon-kendra',
    title: 'Amazon Kendra',
    content:
      '機械学習を活用したインテリジェントなエンタープライズ検索で回答を迅速に見つける。複数の構造化および非構造化コンテンツリポジトリに対して、統一された検索エクスペリエンスを迅速に実装します。自然言語処理 (NLP) を使用することで、機械学習 (ML) の専門知識がなくても、非常に正確な回答を得ることができます。コンテンツの属性、鮮度、ユーザーの行動などに基づいて検索結果を微調整します。ML を活用したインスタント回答、FAQ、ドキュメントのランク付けを、フルマネージド型サービスとして提供します。Amazon Kendra は、ユーザーが組み込みコネクタを使用してさまざまなコンテンツリポジトリを検索できるようにするインテリジェントなエンタープライズ検索サービスです。Amazon Kendra インテリジェント検索サービスが組織にどのように役立つかについて説明します。',
    url: 'https://aws.amazon.com/jp/kendra/',
  },
];

interface SyncCustomDataSourceProps {}

const fetchData = async () => {
  const res = await fetch('https://dummyjson.com/products');
  console.log(res);
  const data = await res.json();
  console.log(data);
  return data;;
}

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

  const data: any = await fetchData();
  const documents = data.products.map((d: any) => {
    return {
      Id: d.id.toString(),
      Title: d.title,
      Blob: new TextEncoder().encode(d.description),
      ContentType: 'PLAIN_TEXT',
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
            StringValue: `https://dummyjson.com/products/${d.id}`,
          },
        },
      ],
    }
  });

  let offset = 0;

  while (true) {
    const subDocuments = documents.slice(offset, offset + 10);

    console.log('subDocuments', subDocuments.length);

    if (subDocuments.length === 0) {
      break;
    }

    const batchPutDocumentCommand = new BatchPutDocumentCommand({
      IndexId: INDEX_ID,
      RoleArn: undefined,
      Documents: subDocuments,
      CustomDocumentEnrichmentConfiguration: undefined,
    });

    await kendra.send(batchPutDocumentCommand);

    offset += 10;
  }

  const stopDataSourceSyncJobCommand = new StopDataSourceSyncJobCommand({
    Id: DATA_SOURCE_ID,
    IndexId: INDEX_ID,
  });
  await kendra.send(stopDataSourceSyncJobCommand);
};
