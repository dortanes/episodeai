import type OpenAI from './openai.js';
import type Perplexity from './perplexity.js';
import Streamlabs from './streamlabs.js';
import type Uberduck from './uberduck.js';

export interface Character {
  id: string;
  spell: string[];
  voiceUuid: string;
}

export interface EpisodeDialog {
  cid: string;
  text: string;
  audio: string;
  topic?: Topic;
  title: string;
}

export type apiInfer = {
  pai?: Perplexity;
  openai: OpenAI;
  sl: Streamlabs;
  ud: Uberduck;
};

export type Topic = {
  nickname: string;
  text: string;
};
