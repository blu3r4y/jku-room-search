# https://github.com/devcontainers/images/tree/main/src/typescript-node

ARG VARIANT="20"
FROM mcr.microsoft.com/devcontainers/typescript-node:${VARIANT}

RUN corepack enable && \
    yarn set version stable
