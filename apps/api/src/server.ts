import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = await createApp({ config });

const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
for (const signal of signals) {
  process.on(signal, () => {
    app.log.info({ signal }, "Shutting down API");
    void app.close().finally(() => process.exit(0));
  });
}

await app.listen({
  host: config.API_HOST,
  port: config.API_PORT
});
