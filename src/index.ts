import { createServer } from "./server.js";
import { createAppServices } from "./services/index.js";
import { loadConfig } from "./utils/config.js";
import { createLogger } from "./utils/logger.js";

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.env);
  const services = createAppServices(config);
  const server = createServer(config, services, logger);
  server.listen(config.port, config.host);
}

void bootstrap().catch((error) => {
  const config = loadConfig();
  const logger = createLogger(config.env);
  logger.error({ err: error }, "failed to start service");
  process.exitCode = 1;
});
