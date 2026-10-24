import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createClient } from "./client.js";
import { ConfigError, loadConfig, type Config } from "./config.js";
import { createServer } from "./server.js";

function main(): void {
  let config: Config;
  try {
    config = loadConfig(process.env);
  } catch (error) {
    if (error instanceof ConfigError) {
      // stderr only: stdout belongs to the protocol.
      console.error(`DeckDen MCP server can't start. ${error.message}`);
      // Not process.exit(): setting the code lets the message finish writing first.
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  const client = createClient(config);
  serveStdio(() => createServer(client));
}

main();
