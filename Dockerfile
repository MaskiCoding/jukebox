FROM node:26-alpine AS runtime

RUN apk --no-cache upgrade && apk add --no-cache tini

ENV NODE_ENV=production \
    HOST=:: \
    PORT=3000

WORKDIR /app

# The app has no runtime dependencies (package.json declares none and no lock
# file is committed), so only the server entry, its manifest and static assets
# are copied. Tests are not shipped.
COPY package.json server.mjs ./
COPY public ./public

# Remove npm, npx, corepack and yarn from the runtime image.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg

EXPOSE 3000

USER node

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.mjs"]
