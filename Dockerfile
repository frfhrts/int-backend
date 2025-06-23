FROM docker.io/node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM docker.io/node:20-bookworm-slim AS prod

ARG USERNAME=nonroot
ARG USER_UID=1001
ARG USER_GID=$USER_UID
ARG PROJECT_HOME=/home/$USERNAME/app

ARG APP_VERSION=unknown
ENV APP_VERSION=${APP_VERSION}
LABEL APP_VERSION=${APP_VERSION}

ARG GIT_COMMIT_BRANCH=unknown
ENV GIT_COMMIT_BRANCH=${GIT_COMMIT_BRANCH}
LABEL GIT.COMMIT_BRANCH=${GIT_COMMIT_BRANCH}

ARG GIT_COMMIT_TAG=unknown
ENV GIT_COMMIT_TAG=${GIT_COMMIT_TAG}
LABEL GIT.COMMIT_TAG=${GIT_COMMIT_TAG}

ARG GIT_COMMIT_SHA=unknown
ENV GIT_COMMIT_SHA=${GIT_COMMIT_SHA}
LABEL GIT.COMMIT_SHA=${GIT_COMMIT_SHA}

ARG GIT_COMMIT_TIMESTAMP=unknown
ENV GIT_COMMIT_TIMESTAMP=${GIT_COMMIT_TIMESTAMP}
LABEL GIT.COMMIT_TIMESTAMP=${GIT_COMMIT_TIMESTAMP}

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Combine all apt operations in a single layer and clean up cache
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    locales \
    unzip \
    curl \
    ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN useradd -ms /bin/bash nonroot

RUN sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && \
    locale-gen && \
    dpkg-reconfigure --frontend=noninteractive locales && \
    update-locale LANG=en_US.UTF-8

ENV LANG en_US.UTF-8

RUN groupmod --gid $USER_GID $USERNAME \
    && usermod --uid $USER_UID --gid $USER_GID $USERNAME \
    && mkdir -p $PROJECT_HOME \
    && chown -R $USER_UID:$USER_GID /home/$USERNAME \
    && chown -R $USER_UID:$USER_GID $PROJECT_HOME

USER $USERNAME
WORKDIR $PROJECT_HOME

WORKDIR /app
# WORKDIR $PROJECT_HOME

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules


CMD [ "node", "dist/main" ]