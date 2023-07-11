import { resolve } from 'path';
import { readFileSync } from 'fs';
import type { EpisodeDialog, Character, apiInfer, Topic } from './types.js';
import { settingsDb, episodesDb, topicsDb } from './database.js';
import { base64AB } from './helpers.js';

const themes: string[] = JSON.parse(
  readFileSync(resolve(process.cwd(), 'data', 'themes.json'), 'utf8'),
);

const path = '/episodes';

export default class Episode {
  static isGenerating = false;

  constructor(
    private api: apiInfer,
    private charactersList: Character[],
    private dialog: EpisodeDialog[] = [],
  ) {}

  async create() {
    if (this.dialog.length > 1) return false;

    // Generate dialog
    const theme = themes[Math.floor(Math.random() * themes.length)];

    const topic: Topic = await topicsDb
      .getData('/topics[-1]')
      .catch(() => null);
    if (topic) {
      const topicIndex = await topicsDb.getIndexValue('/topics', topic as any);
      console.log(topic, topicIndex);

      if (topicIndex !== -1)
        await topicsDb.delete('/topics[' + topicIndex + ']');
    }

    const dialogText = await this.api.openai.complete(
      process.env.PROMPT.replace('#t', process.env.TITLE)
        .replace('#p', theme)
        .replace(
          '#c',
          this.charactersList.map((ch) => ch.spell[0]).join(', '),
        ) + (topic ? ' Topic: ' + topic.text : ''),
    );

    if (!dialogText) return null;

    let dialogTitle = topic?.text;
    if (!topic) {
      const titleResponse = await this.api.openai.complete(
        'Generate a title for this dialog: \n' + dialogText.content,
      );
      if (!titleResponse) return null;
      dialogTitle = titleResponse.content;
    }

    // const dialogText = await this.api.pai.ask(
    //   process.env.PROMPT.replace('#t', process.env.TITLE)
    //     .replace('#p', theme)
    //     .replace('#c', this.charactersList.map((ch) => ch.spell[0]).join(', ')),
    // );

    console.log(dialogText.content, dialogTitle);

    const parsedText = dialogText.content.split('\n');

    for (const txt of parsedText) {
      const pron = txt.split(':')[0];
      const text = txt
        .split(':')[1]
        ?.trim()
        .replace(/\[\d+\]/g, '');

      if (!text) continue;

      const ch = this.charactersList.find(
        (ch) => ch.spell.filter((sp) => pron.includes(sp)).length > 0,
      );

      if (ch) {
        // Get TTS
        const tts = await this.api.ud.speech(text, ch.voiceUuid);

        // Save dialog
        this.dialog.push({
          cid: ch.id,
          text: text,
          audio: tts ? base64AB(tts.data) : null,
          topic: topic ? topic : null,
          title: dialogTitle,
        });
      }
    }

    await episodesDb.push(path + '[]', this.dialog, true);
    return true;
  }

  static async generateEpisodes(api: apiInfer, cb: CallableFunction) {
    const minEpCount = Number(process.env.QUEUE_MIN_EP_COUNT);

    // Load characters list
    const charactersList: Character[] = await settingsDb.getData('/characters');

    // Get episodes count
    const episodesCount = await episodesDb.count(path);
    console.log(episodesCount, 'episodes count');

    if (Episode.isGenerating === false && episodesCount <= minEpCount) {
      Episode.isGenerating = true;

      console.info('Generating episodes...');

      for (let i = 0; i < Number(process.env.QUEUE_EP_COUNT); i++) {
        await new Episode(api, charactersList).create();
        console.info('Episode', i, 'was been generated');
      }

      Episode.isGenerating = false;
      console.info('Episodes was been generated');
      cb();
    }
  }
}
