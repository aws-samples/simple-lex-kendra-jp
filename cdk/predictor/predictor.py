import boto3
import json


# FIXME: Remove------------------------------
ROLEARN_FOR_BEDROCK = "arn:aws:iam::936931980683:role/BedrockRole4RP"

sts_client = boto3.client("sts")

assumed_role_object = sts_client.assume_role(
    RoleArn=ROLEARN_FOR_BEDROCK,
    RoleSessionName="bedrock-session",
)

credentials = assumed_role_object["Credentials"]

aws_session = boto3.Session(
    aws_access_key_id=credentials["AccessKeyId"],
    aws_secret_access_key=credentials["SecretAccessKey"],
    aws_session_token=credentials["SessionToken"],
)

REGION = "us-east-1"
endpoint_url = f"https://bedrock.{REGION}.amazonaws.com"
client = aws_session.client("bedrock", REGION, endpoint_url=endpoint_url)
# ------------------------------



def _create_body(prompt: str):
  parameter = {
      "max_tokens_to_sample": 500,
      "temperature": 0.0,
      "top_k": 250,
      "top_p": 0.999,
      "stop_sequences": [],
  }
  parameter["prompt"] = prompt
  return json.dumps(parameter)



def _extract_output_text(response) -> str:
  output = json.loads(response.get("body").read())
  output_txt = output["completion"]
  if output_txt[0] == " ":
      # claude outputs a space at the beginning of the text
      output_txt = output_txt[1:]
  return output_txt



def handler(event, context):
  body = json.loads(event['body'])
  print("Body", body)

  payload = _create_body(body['prompt'])

  model_id = "anthropic.claude-v2"
  accept = "application/json"
  content_type = "application/json"

  response = client.invoke_model(
      body=payload, modelId=model_id, accept=accept, contentType=content_type
  )

  output_txt = _extract_output_text(response)

  return {
        'isBase64Encoded': False,
        'statusCode': 200,
        # 'body': json.dumps(output_txt, ensure_ascii=False),
        'body': output_txt,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
    }

