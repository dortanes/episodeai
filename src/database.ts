import { JsonDB, Config } from 'node-json-db';
export const settingsDb = new JsonDB(new Config('settings', true, false, '/'));
export const episodesDb = new JsonDB(new Config('episodes', true, false, '/'));
export const topicsDb = new JsonDB(new Config('topics', true, false, '/'));
