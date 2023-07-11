import dotenv from 'dotenv';
// import Perplexity from './perplexity.js';
import Uberduck from './uberduck.js';
import Server from './server.js';
import OpenAI from './openai.js';
import Streamlabs from './streamlabs.js';

dotenv.config();

await (async () => {
  // Create Perplexity instance and connect
  // const pai = new Perplexity();
  // await pai.connect();

  // Create OpenAI instance
  const openai = new OpenAI();

  // Create Uberduck instance
  const ud = new Uberduck();

  // Create Streamlabs instance and connect
  const sl = new Streamlabs();
  await sl.connect();

  // Create server instance
  new Server({ openai, sl, ud });
})();
