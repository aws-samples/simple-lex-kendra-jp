import React, { useCallback } from 'react';
import useS3Downloader from '../hooks/useS3Downloader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile } from '@fortawesome/free-solid-svg-icons';

type Props = {
  className?: string;
  title: string;
  uri: string;
};

const ChatReferenceDoc: React.FC<Props> = (props) => {
  const { isS3DocumentURI, s3Path, download } = useS3Downloader(props.uri);

  const openUrl = useCallback(() => {
    window.open(props.uri, '_blank');
  }, [props.uri]);

  return (
    <div className={`${props.className ?? ''} text-xs break-all`}>
      <div className="font-semibold">{props.title}</div>

      {isS3DocumentURI ? (
        <div className="ml-3 text-sky-400 cursor-pointer" onClick={download}>
          <FontAwesomeIcon className="mr-2" icon={faFile} />
          {s3Path}
        </div>
      ) : (
        <div className="ml-3 text-sky-400 cursor-pointer" onClick={openUrl}>
          {props.uri}
        </div>
      )}
    </div>
  );
};

export default ChatReferenceDoc;
