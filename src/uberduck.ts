import axios from 'axios';
import PQueue from 'p-queue';
import promiseRetry from 'promise-retry';

export default class Uberduck {
  private queue = new PQueue({
    concurrency: 2,
    timeout: 30 * 1000,
    autoStart: true,
    throwOnTimeout: false,
  });

  constructor(
    private host = 'https://api.uberduck.ai',
    private key = process.env.UD_KEY,
    private secret = process.env.UD_SECRET,
  ) {
    //
  }

  async speech(text: string, uuid: string) {
    return await this.queue.add(() =>
      promiseRetry(
        async () => {
          try {
            return await axios.post(
              this.host + '/speak-synchronous',
              {
                speech: text,
                voicemodel_uuid: uuid,
              },
              {
                headers: {
                  Accept: 'audio/wav',
                },
                auth: {
                  username: this.key,
                  password: this.secret,
                },
                responseType: 'arraybuffer',
              },
            );
          } catch (_) {
            throw 'retry';
          }
        },
        {
          retries: 3,
          minTimeout: 25 * 1000,
        },
      ),
    );
  }
}
