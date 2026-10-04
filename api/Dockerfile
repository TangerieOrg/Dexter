FROM denoland/deno:2.9.2

WORKDIR /app

COPY deno.json deno.lock ./
COPY src ./src
RUN deno install --frozen --entrypoint src/main.ts

ENV DB_PATH=/data/dexter.db
ENV PORT=80
VOLUME /data
EXPOSE 80

CMD ["deno", "task", "start"]
