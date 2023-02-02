import React, { useMemo } from 'react';
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

interface DocumentProps {
  document: QueryResultItem;
}

function Document(props: DocumentProps) {
  const { docTitle, docText, hasDocumentURI, hasS3DocumentURI, downloadFile } =
    useMemo(() => {
      const docTitle = props.document.DocumentTitle?.Text || '';
      const docText = props.document.DocumentExcerpt?.Text || '';

      const hasDocumentURI = !!props.document.DocumentURI;
      const hasS3DocumentURI =
        props.document.DocumentURI?.startsWith('https://s3.');

      const downloadFile = async (): Promise<void> => {
        const bucket_keys = new URL(props.document.DocumentURI!).pathname.split(
          '/'
        );
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

        const objectUrl = await getSignedUrl(s3, getObject, {
          expiresIn: 3600,
        });

        window.open(objectUrl, '_blank', 'noopener,noreferrer');
      };

      return {
        docTitle,
        docText,
        hasDocumentURI,
        hasS3DocumentURI,
        downloadFile,
      };
    }, [props]);

  return (
    <li key={props.document.Id} className="mb-3">
      {hasDocumentURI && hasS3DocumentURI && (
        <div
          className="text-xs text-blue-400 font-bold mb-2 flex items-center cursor-pointer"
          onClick={() => downloadFile()}
        >
          <FontAwesomeIcon className="mr-1" icon={faArrowUpRightFromSquare} />
          <div>{docTitle}</div>
        </div>
      )}

      {hasDocumentURI && !hasS3DocumentURI && (
        <a
          href={props.document.DocumentURI}
          className="text-xs text-blue-400 font-bold mb-2 flex items-center cursor-pointer"
          target="_blank"
          rel="noreferrer"
        >
          <FontAwesomeIcon className="mr-1" icon={faArrowUpRightFromSquare} />
          <div>{docTitle}</div>
        </a>
      )}

      {!hasDocumentURI && (
        <div className="text-xs text-gray-400 font-bold mb-2 flex items-center cursor-pointer">
          <div>docTitle</div>
        </div>
      )}

      <div className="text-xs text-gray-700 p-2 border border-gray-700 rounded-md">
        {docText}
      </div>
    </li>
  );
}

function Documents(props: DocumentsProps) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-2">
        関連するドキュメントはこちらです
      </div>
      <ul>
        {props.items.map((document, idx) => (
          <Document document={document} key={idx} />
        ))}
      </ul>
    </div>
  );
}

export default Documents;
