# Define custom function directory
ARG FUNCTION_DIR="/function"

FROM python:3.11 as build-image

# Include global arg in this stage of the build
ARG FUNCTION_DIR

RUN apt update && apt install -y curl unzip

# Copy function code
RUN mkdir -p ${FUNCTION_DIR}
COPY . ${FUNCTION_DIR}

RUN curl -O https://d2eo22ngex1n9g.cloudfront.net/Documentation/SDK/bedrock-python-sdk.zip
RUN unzip bedrock-python-sdk.zip

# Install the function's dependencies
RUN python3 -m pip install --target ${FUNCTION_DIR} ./botocore-*.whl --no-cache-dir \
    && python3 -m pip install --target ${FUNCTION_DIR} ./boto3-*.whl --no-cache-dir \
    && python3 -m pip install --target ${FUNCTION_DIR} awslambdaric

# Use a slim version of the base Python image to reduce the final image size
FROM python:3.11-slim

# Include global arg in this stage of the build
ARG FUNCTION_DIR
# Set working directory to function root directory
WORKDIR ${FUNCTION_DIR}

# Copy in the built dependencies
COPY --from=build-image ${FUNCTION_DIR} ${FUNCTION_DIR}

# Set runtime interface client as default command for the container runtime
ENTRYPOINT [ "/usr/local/bin/python", "-m", "awslambdaric" ]
# Pass the name of the function handler as an argument to the runtime
CMD [ "predictor.handler" ]



# FROM python:3.11.4-slim-bullseye

# RUN apt update && apt install -y curl unzip

# COPY . .

# # Install boto3 including bedrock
# RUN curl -O https://d2eo22ngex1n9g.cloudfront.net/Documentation/SDK/bedrock-python-sdk.zip
# RUN unzip bedrock-python-sdk.zip

# RUN python3 -m pip install ./botocore-*.whl --no-cache-dir \
#     && python3 -m pip install ./boto3-*.whl --no-cache-dir

# RUN echo "===TEST======TEST======TEST======TEST======TEST======TEST==="
# RUN ls

# ENTRYPOINT [ "/usr/local/bin/python", "-m", "awslambdaric" ]
# CMD ["predictor.handler"]