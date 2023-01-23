import React from 'react';
import { QueryResultItem } from '@aws-sdk/client-kendra';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

const IDENTITY_POOL_ID = process.env.REACT_APP_IDENTITY_POOL_ID!;
const REGION = process.env.REACT_APP_REGION!;

interface DocumentsProps {
  items: QueryResultItem[];
}

function Documents(props: DocumentsProps) {
  const docs = props.items.map((i) => {
    const docTitle = i.DocumentTitle?.Text || '';
    const docText = i.DocumentExcerpt?.Text || '';

    return (
      <li key={i.Id} className="mb-3">
        <div
          className="text-xs text-blue-400 font-bold mb-2 flex items-center cursor-pointer"
          onClick={() => downloadFile(i)}
        >
          <FontAwesomeIcon className="mr-1" icon={faArrowUpRightFromSquare} />
          <div>{docTitle}</div>
        </div>

        <div className="text-xs text-gray-700 p-2 border border-gray-700 rounded-md">
          {docText}
        </div>
      </li>
    );
  });

  const downloadFile = async (item: QueryResultItem): Promise<void> => {
    const bucket_keys = new URL(item.DocumentURI!).pathname.split('/');
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
    <div>
      <div className="text-xs text-gray-500 mb-2">
        関連するドキュメントはこちらです
      </div>
      <ul>{docs}</ul>
    </div>
  );
}

export default Documents;
