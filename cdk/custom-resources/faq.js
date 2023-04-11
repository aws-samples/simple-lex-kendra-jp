const {
  KendraClient,
  CreateFaqCommand,
  DeleteFaqCommand,
} = require('@aws-sdk/client-kendra');

const client = new KendraClient({});

const createFaq = async (props) => {
  const createFaqCommand = new CreateFaqCommand(props);
  return client.send(createFaqCommand);
};

const deleteFaq = async (props) => {
  const deleteFaqCommand = new DeleteFaqCommand(props);
  return client.send(deleteFaqCommand);
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
  const body = JSON.stringify({
    Status: status,
    Reason: reason,
    PhysicalResourceId: physicalResourceId,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    NoEcho: false,
    Data: {},
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

  const props = JSON.parse(event.ResourceProperties.props);

  console.log(props);

  try {
    switch (event.RequestType) {
      case 'Create':
        const propsCreate = copyLimitedKeys(props, [
          'ClientToken',
          'Description',
          'FileFormat',
          'IndexId',
          'LanguageCode',
          'Name',
          'RoleArn',
          'S3Path',
          'Tags',
        ]);

        const res = await createFaq(propsCreate);

        await updateStatus(event, 'SUCCESS', 'Successfully created', res.Id);
        break;
      case 'Update':
        const propsUpdate = copyLimitedKeys(props, [
          'ClientToken',
          'Description',
          'FileFormat',
          'IndexId',
          'LanguageCode',
          'Name',
          'RoleArn',
          'S3Path',
          'Tags',
        ]);

        // Need to change "Name" of "Description"
        // Here we add RequestId suffix to the description
        propsUpdate.Description =
          (propsUpdate.Description ?? '') + event.RequestId;

        const updateCreate = await createFaq(propsUpdate);

        await updateStatus(
          event,
          'SUCCESS',
          'Successfully updated',
          updateCreate.Id
        );
        break;
      case 'Delete':
        const propsDelete = copyLimitedKeys(props, ['IndexId']);

        propsDelete.Id = event.PhysicalResourceId;

        await deleteFaq(propsDelete);
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
