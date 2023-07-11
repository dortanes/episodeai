import { Configuration, OpenAIApi } from 'openai';
import PQueue from 'p-queue';
import promiseRetry from 'promise-retry';

export default class OpenAI {
  private queue = new PQueue({
    concurrency: 2,
    timeout: 30 * 1000,
    autoStart: true,
    throwOnTimeout: false,
  });

  private config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });

  private openai = new OpenAIApi(this.config);

  public async complete(prompt: string) {
    return await this.queue.add(() =>
      promiseRetry(
        async () => {
          const chatCompletion = await this.openai.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
          });

          return chatCompletion.data.choices[0].message;
        },
        {
          retries: 2,
          minTimeout: 15 * 1000,
        },
      ),
    );
  }
}
