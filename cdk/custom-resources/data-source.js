const {
  KendraClient,
  CreateDataSourceCommand,
  UpdateDataSourceCommand,
  DeleteDataSourceCommand,
} = require('@aws-sdk/client-kendra');

const client = new KendraClient({});

const createDataSource = async (props) => {
  const createDataSourceCommand = new CreateDataSourceCommand(props);
  return client.send(createDataSourceCommand);
};

const updateDataSource = async (props) => {
  const updateDataSourceCommand = new UpdateDataSourceCommand(props);
  return client.send(updateDataSourceCommand);
};

const deleteDataSource = async (props) => {
  const deleteDataSourceCommand = new DeleteDataSourceCommand(props);
  return client.send(deleteDataSourceCommand);
};

// TypeScript の Pick<_, _> のようなもの
const copyLimitedKeys = (src, keys) => {
  return Object.assign(
    {},
    ...keys.map((k) => {
      const tmp = {};
      tmp[k] = src[k];
      return tmp;
    })
  );
};

const updateStatus = async (event, status, reason, physicalResourceId) => {
  const region = process.env.AWS_REGION;
  const accountId = event.ServiceToken.split(':')[4];
  const arn = `arn:aws:kendra:${region}:${accountId}:index/${event.ResourceProperties.IndexId}/data-source/${physicalResourceId}`;
  const body = JSON.stringify({
    Status: status,
    Reason: reason,
    PhysicalResourceId: physicalResourceId,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    NoEcho: false,
    Data: {
      Id: physicalResourceId,
      Arn: arn,
    },
  });

  const res = await fetch(event.ResponseURL, {
    method: 'PUT',
    body,
    headers: {
      'Content-Type': '',
      'Content-Length': body.length.toString(),
    },
  });

  console.log(res);
  console.log(await res.text());
};

exports.handler = async (event, context) => {
  console.log(event);
  console.log(context);

  try {
    switch (event.RequestType) {
      case 'Create':
        const propsCreate = copyLimitedKeys(event.ResourceProperties, [
          'ClientToken',
          'Configuration',
          'CustomDocumentEnrichmentConfiguration',
          'Description',
          'IndexId',
          'LanguageCode',
          'Name',
          'RoleArn',
          'Schedule',
          'Tags',
          'Type',
          'VpcConfiguration',
        ]);

        const res = await createDataSource(propsCreate);

        await updateStatus(event, 'SUCCESS', 'Successfully created', res.Id);
        break;
      case 'Update':
        const propsUpdate = copyLimitedKeys(event.ResourceProperties, [
          'Configuration',
          'CustomDocumentEnrichmentConfiguration',
          'Description',
          'IndexId',
          'LanguageCode',
          'Name',
          'RoleArn',
          'Schedule',
          'VpcConfiguration',
        ]);

        propsUpdate.Id = event.PhysicalResourceId;

        await updateDataSource(propsUpdate);
        await updateStatus(
          event,
          'SUCCESS',
          'Successfully updated',
          propsUpdate.Id
        );
        break;
      case 'Delete':
        const propsDelete = copyLimitedKeys(event.ResourceProperties, [
          'IndexId',
        ]);

        propsDelete.Id = event.PhysicalResourceId;

        await deleteDataSource(propsDelete);
        await updateStatus(
          event,
          'SUCCESS',
          'Successfully deleted',
          propsDelete.Id
        );
        break;
    }
  } catch (e) {
    console.log('---- Error');
    console.log(e);

    if (event.PhysicalResourceId) {
      await updateStatus(event, 'FAILED', e.message, event.PhysicalResourceId);
    } else {
      await updateStatus(
        event,
        'FAILED',
        e.message,
        event.ResourceProperties.IndexId
      );
    }
  }
};
