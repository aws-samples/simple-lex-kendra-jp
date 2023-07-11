import * as lambda from 'aws-lambda';
import {
  AttributeFilter,
  DocumentAttributeValueType,
  KendraClient,
  QueryCommand,
} from '@aws-sdk/client-kendra';

const INDEX_ID = process.env.INDEX_ID;

exports.handler = async (
  event: lambda.APIGatewayProxyEvent
): Promise<lambda.APIGatewayProxyResult> => {
  const query = JSON.parse(event.body!).query;
  const filters:
    | {
        attributeKey: string;
        attributeType: DocumentAttributeValueType;
        value: (string | number | Date)[];
      }[]
    | undefined = JSON.parse(event.body!).filters;

  if (!query) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'query is not specified' }),
    };
  }

  // デフォルト言語が英語なので、言語設定は必ず行う
  const attributeFilter: AttributeFilter = {
    AndAllFilters: [
      {
        EqualsTo: {
          Key: '_language_code',
          Value: {
            StringValue: 'ja',
          },
        },
      },
    ],
  };

  // 絞り込み条件に沿って AttributeFilter を設定する
  if (filters) {
    filters.forEach((f) => {
      if (f.attributeType === 'STRING_VALUE') {
        attributeFilter.AndAllFilters?.push({
          OrAllFilters: f.value.map((val) => ({
            EqualsTo: {
              Key: f.attributeKey,
              Value: {
                StringValue: val.toString(),
              },
            },
          })),
        });
      } else if (f.attributeType === 'STRING_LIST_VALUE') {
        attributeFilter.AndAllFilters?.push({
          ContainsAny: {
            Key: f.attributeKey,
            Value: {
              StringListValue: f.value.map((v) => v.toString()),
            },
          },
        });
      } else if (f.attributeType === 'LONG_VALUE') {
        attributeFilter.AndAllFilters?.push({
          OrAllFilters: f.value.map((val) => ({
            EqualsTo: {
              Key: f.attributeKey,
              Value: {
                LongValue: Number.parseFloat(f.value.toString()),
              },
            },
          })),
        });
      } else if (f.attributeType === 'DATE_VALUE') {
        attributeFilter.AndAllFilters?.push({
          AndAllFilters: [
            {
              GreaterThanOrEquals: {
                Key: f.attributeKey,
                Value: {
                  DateValue: new Date(f.value.toString()),
                },
              },
            },
            {
              LessThanOrEquals: {
                Key: f.attributeKey,
                Value: {
                  DateValue: new Date(f.value.toString()),
                },
              },
            },
          ],
        });
      }
    });
  }
  console.log('AttributeFilter', JSON.stringify(attributeFilter));

  const kendra = new KendraClient({});
  const queryCommand = new QueryCommand({
    IndexId: INDEX_ID,
    QueryText: query,
    AttributeFilter: attributeFilter,
  });

  const queryRes = await kendra.send(queryCommand);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(queryRes),
  };
};
