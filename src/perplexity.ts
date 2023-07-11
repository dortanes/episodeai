/* eslint-disable @typescript-eslint/no-explicit-any */
import { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface PerplexityResponse {
  status: string;
  uuid: string;
  read_write_token: string;
  text: string;
  final: boolean;
  related_queries: string[];
  query_str: string;
  json?: any;
  entry_id?: any;
  rendered_plot_json?: any;
  model_output_id?: any;
  code: string;
  image_url?: any;
  label: string;
  backend_uuid: string;
  context_uuid: string;
  thread_title?: any;
  author_username?: any;
  author_image?: any;
  s3_social_preview_url: string;
  answer: PerplexityResponseJSON;
}

interface PerplexityResponseJSON {
  answer: string;
  web_results: Webresult[];
  chunks: string[];
  detailed: boolean;
  entity_links: any[];
  extra_web_results: Webresult[];
  deleted_urls: any[];
  search_focus: string;
  image_urls: any[];
}

interface Webresult {
  name: string;
  url: string;
  snippet: string;
  language: string;
  source: string;
}

export default class Perplexity {
  private serverUrl = 'https://www.perplexity.ai/';
  public client: Socket;
  private token = `f${getRandomInt(100000, 999999)}`;
  private frontendSessionId = process.env.PAI_SESSION_ID;
  private frontendUuid = process.env.PAI_UUID;

  constructor() {
    this.client = io(this.serverUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: 19,
      auth: { jwt: 'anonymous-ask-user' },
      forceBase64: false,
      transports: ['websocket'],
      extraHeaders: {
        Origin: 'chrome-extension://hlgbcneanomplepojfcnclggenpcoldo',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
      },
    } as any);

    this.client.on('connect_error', (err: Error) =>
      console.error(err, err.stack, err.message),
    );
  }

  async connect() {
    await new Promise((res) => {
      this.client.once('connect', () => res(1));
      this.client.connect();
    });
  }

  async ask(text: string): Promise<PerplexityResponse> {
    return await new Promise((resolve, reject) => {
      this.client.emit(
        'perplexity_ask',
        text,
        {
          source: 'chrome_extension',
          token: this.token,
          last_backend_uuid: false,
          read_write_token: false,
          conversational_enabled: false,
          frontend_session_id: this.frontendSessionId,
          frontend_uuid: this.frontendUuid,
          language: 'en-US',
          timezone: 'Asia/Tbilisi',
          search_focus: 'internet',
        },
        (res: PerplexityResponse) => {
          if (res.status === 'failed') reject(res.text);
          else
            resolve({
              ...res,
              answer: JSON.parse(res.text) as PerplexityResponseJSON,
            });
        },
      );
    });
  }
}
