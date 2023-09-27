import React, { useMemo } from 'react';
import { TextWithHighlights } from '@aws-sdk/client-kendra';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleExclamation, faFile } from '@fortawesome/free-solid-svg-icons';
import { QueryResultItem } from '@aws-sdk/client-kendra';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import HighlightText from './HighlightText';
import { getJwtToken } from '../lib/fetcher';

const IDENTITY_POOL_ID = process.env.REACT_APP_IDENTITY_POOL_ID!;
const USER_POOL_ID = process.env.REACT_APP_USER_POOL_ID!;
const REGION = process.env.REACT_APP_REGION!;
const COGNITO_ID = `cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;

interface TypeDocumentProps {
  item: QueryResultItem;
  // Featured Results の場合は、Trueを設定
  // https://docs.aws.amazon.com/ja_jp/kendra/latest/dg/featured-results.html
  isFeatured?: boolean;
}

function TypeDocument(props: TypeDocumentProps) {
  const { title, body, hasDocumentURI, hasS3DocumentURI, downloadFile } =
    useMemo(() => {
      const title: TextWithHighlights = props.item.DocumentTitle || {
        Text: '',
        Highlights: [],
      };
      const body: TextWithHighlights = props.item.DocumentExcerpt || {
        Text: '',
        Highlights: [],
      };

      const hasDocumentURI = !!props.item.DocumentURI;
      const hasS3DocumentURI =
        props.item.DocumentURI?.startsWith('https://s3.');

      const downloadFile = async (event: any): Promise<void> => {
        // [Auth 拡張実装] JWT トークンが取得できていない場合は処理しない
        const token = await getJwtToken();
        if (!token) {
          // デモのため、エラー処理は Alert を表示するだけの簡易的な実装
          alert(
            '認証トークンが取得できませんでした。サインアウトしてから再度試してみてください。'
          );
          return;
        }

        const bucket_keys = new URL(props.item.DocumentURI!).pathname.split(
          '/'
        );
        const bucket = bucket_keys[1];
        const key = bucket_keys.slice(2, bucket_keys.length).join('/');
        const s3 = new S3Client({
          region: REGION,
          credentials: fromCognitoIdentityPool({
            identityPoolId: IDENTITY_POOL_ID,
            clientConfig: { region: REGION },
            // [Auth 拡張実装] ログイン情報を付与する
            logins: {
              [COGNITO_ID]: token,
            },
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

      return { title, body, hasDocumentURI, hasS3DocumentURI, downloadFile };
    }, [props]);

  return (
    <div
      className={`p-4 mb-3 ${
        props.isFeatured && 'ring-1 ring-gray-400 rounded'
      }`}
    >
      {hasDocumentURI && hasS3DocumentURI && (
        <div
          className="text-xs text-sky-400 flex items-center cursor-pointer mb-1 ml-1 w-fit"
          onClick={downloadFile}
        >
          <FontAwesomeIcon className="mr-2" icon={faFile} />
          <div className="text-sky-400">
            <HighlightText textWithHighlights={title} />
          </div>
        </div>
      )}
      {hasDocumentURI && !hasS3DocumentURI && (
        <a
          className="text-xs text-sky-400 flex items-center cursor-pointer mb-1 ml-1 w-fit"
          href={props.item.DocumentURI}
        >
          <FontAwesomeIcon className="mr-2" icon={faFile} />
          <div className="text-sky-400">
            <HighlightText textWithHighlights={title} />
          </div>
        </a>
      )}
      {!hasDocumentURI && (
        <div className="text-xs text-sky-400 flex mb-1">
          ドキュメントのソースが見つかりませんでした
        </div>
      )}
      <div className="text-md">
        <HighlightText textWithHighlights={body} />
      </div>

      {props.isFeatured && (
        <div className="flex justify-end items-center -m-2 text-gray-400 font-bold text-xs">
          <FontAwesomeIcon className="mr-2" icon={faCircleExclamation} />
          注目
        </div>
      )}
    </div>
  );
}

export default TypeDocument;
