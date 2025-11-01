import { loadConfig } from "./config.js";
import { createServer } from "./server.js";
import { createAppServices } from "./services/index.js";

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const services = createAppServices(config);
  const server = createServer(config, services);
  server.listen(config.port, config.host);
}

void bootstrap().catch((error) => {
  console.error("failed to start service", error);
  process.exitCode = 1;
});
