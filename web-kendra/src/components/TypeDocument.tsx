import React from 'react';
import { TextWithHighlights } from '@aws-sdk/client-kendra';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile } from '@fortawesome/free-solid-svg-icons';
import { QueryResultItem } from '@aws-sdk/client-kendra';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import HighlightText from './HighlightText';

const IDENTITY_POOL_ID = process.env.REACT_APP_IDENTITY_POOL_ID!;
const REGION = process.env.REACT_APP_REGION!;

interface TypeDocumentProps {
  item: QueryResultItem;
}

function TypeDocument(props: TypeDocumentProps) {
  const title: TextWithHighlights = props.item.DocumentTitle || { Text: '', Highlights: [] };
  const body: TextWithHighlights = props.item.DocumentExcerpt || { Text: '', Highlights: [] };

  const downloadFile = async (event: any): Promise<void> => {
    const bucket_keys = new URL(props.item.DocumentURI!).pathname.split('/');
    const bucket = bucket_keys[1];
    const key = bucket_keys.slice(2, bucket_keys.length).join('/');
    const s3 = new S3Client({
      region: REGION,
      credentials: fromCognitoIdentityPool({
        identityPoolId: IDENTITY_POOL_ID,
        clientConfig: { region: REGION },
      }),
    });

    const contentType = key.endsWith('.txt')
                      ? 'text/plain; charset=utf-8'
                      : undefined;

    const getObject = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentType: contentType,
    });

    const objectUrl = await getSignedUrl(s3, getObject, { expiresIn: 3600 });

    window.open(objectUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="p-4 w-2/3 mb-3">
      <div
        className="text-xs text-sky-400 flex items-center cursor-pointer mb-1 ml-1 w-fit"
        onClick={downloadFile}
      >
        <FontAwesomeIcon className="mr-2" icon={faFile} />
        <div className="text-sky-400">
          <HighlightText textWithHighlights={title} />
        </div>
      </div>
      <div className="text-md">
        <HighlightText textWithHighlights={body} />
      </div>
    </div>
  );
}

export default TypeDocument;
