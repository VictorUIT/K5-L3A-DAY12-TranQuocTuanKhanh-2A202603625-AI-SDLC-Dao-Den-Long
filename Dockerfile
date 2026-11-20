# Linux path for graders (macOS/Linux): runs headless, tests and the static web build.
#   docker build -t dao-den-long .
#   docker run --rm dao-den-long npm test
#   docker run --rm -v "$PWD/out:/out" dao-den-long node src/headless/cli.js --seed 1 --night 1 --ticks 3600 --out /out/run.jsonl
#   docker run --rm -p 4173:4173 dao-den-long          # play at http://localhost:4173
FROM node:20.18.1-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build
EXPOSE 4173
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "4173"]
