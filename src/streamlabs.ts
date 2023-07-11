import EventEmitter from 'events';
import { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

export default class Streamlabs extends EventEmitter {
  private serverUrl = 'wss://aws-io.streamlabs.com';
  private token = process.env.SL_TOKEN;
  private client: Socket;

  constructor() {
    super();

    this.client = io(this.serverUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: 19,
      transports: ['websocket'],
      query: {
        token: this.token,
      },
    });

    this.client.on('connect_error', (err: Error) =>
      console.error(err, err.stack, err.message),
    );
  }

  private listen() {
    this.client.on('event', (event) => {
      if (event.type === 'donation') {
        this.emit('donation', event.message[0]);
      }
    });
  }

  async connect() {
    this.listen();
    await new Promise((res) => {
      this.client.once('connect', () => res(1));
      this.client.connect();
    });
  }
}
