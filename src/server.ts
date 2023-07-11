import { Server as IOServer } from 'socket.io';
import cohere from 'cohere-ai';
import { episodesDb, topicsDb } from './database.js';
import Episode from './episode.js';
import type { apiInfer } from './types.js';
import toxicityData from './toxicityData.js';

export default class Server {
  private port = Number(process.env.SERVER_PORT);
  public io: IOServer = new IOServer({
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  constructor(public api: apiInfer) {
    cohere.init(process.env.COHERE_KEY);

    this.io.on('connection', async (socket) => {
      console.log('connected', socket.id);

      // When client is ready
      socket.on('client:ready', async (next = false) => {
        if (next) {
          console.info('Deleting episode', next);
          await episodesDb.delete('/episodes[0]').catch(() => 0);
          void Episode.generateEpisodes(api, () =>
            this.io.emit('episode:ready'),
          );
        }

        let episode = await this.getEpisode();

        if (!episode) {
          socket.emit('episode:pending');
          await Episode.generateEpisodes(api, () =>
            this.io.emit('episode:ready'),
          );
          episode = await this.getEpisode();
          if (episode) socket.emit('episode:start', episode);

          return;
        }

        socket.emit('episode:start', episode);
      });
    });

    // Listen for connections
    this.io.listen(this.port);
    console.info('Server started on port', this.port);

    // Listen for donations on Streamlabs
    this.listenDonations();
  }

  listenDonations() {
    this.api.sl.on('donation', async (donation) => {
      const donationMsg = donation.message.replace('!topic', '').trim();

      const toxicity = await cohere.classify({
        inputs: [donationMsg],
        examples: toxicityData,
      });

      if (
        toxicity.body.classifications[0]?.prediction === 'Benign' ||
        toxicity.body.classifications[0]?.confidence < 0.8
      ) {
        if (donation.message.includes('!topic')) {
          await topicsDb.push(
            '/topics[]',
            {
              nickname: donation.from,
              text: donationMsg,
            },
            true,
          );
        }

        this.io.emit('donation', donation);
      } else {
        console.info('Toxic text detected', toxicity.body.classifications[0]);
        this.io.emit('donation', { ...donation, message: '(censored)' });
      }
    });
  }

  async getEpisode() {
    try {
      const episode = await episodesDb.getData('/episodes[0]');
      if (!episode) return null;
      else return episode;
    } catch (_) {
      return null;
    }
  }
}
