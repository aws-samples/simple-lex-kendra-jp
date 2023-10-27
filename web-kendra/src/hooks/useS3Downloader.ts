import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getJwtToken } from '../lib/fetcher';

const IDENTITY_POOL_ID = process.env.REACT_APP_IDENTITY_POOL_ID!;
const REGION = process.env.REACT_APP_REGION!;
const USER_POOL_ID = process.env.REACT_APP_USER_POOL_ID!;
const COGNITO_ID = `cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;

const useS3Downloader = (uri: string) => {
  const isS3DocumentURI = uri.startsWith('https://s3.');
  const bucket_keys = new URL(uri).pathname.split('/');
  const bucket = bucket_keys[1];
  const key = bucket_keys.slice(2, bucket_keys.length).join('/');

  return {
    isS3DocumentURI,
    s3Path: `s3://${bucket}/${key}`,
    download: async (): Promise<void> => {
      if (!isS3DocumentURI) {
        console.error('S3ドキュメントのURIではありません。');
        return;
      }

      const token = await getJwtToken();
      // [Auth 拡張実装] トークンを取得できない場合は処理しない
      if (!token) {
        console.error('認証トークンが取得できませんでした。');
        return;
      }

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
        Key: decodeURIComponent(key),
        ResponseContentType: contentType,
      });

      const objectUrl = await getSignedUrl(s3, getObject, {
        expiresIn: 3600,
      });

      window.open(objectUrl, '_blank', 'noopener,noreferrer');
    },
  };
};

export default useS3Downloader;
