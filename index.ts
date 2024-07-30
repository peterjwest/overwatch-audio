import { JSDOM } from 'jsdom';
import fs from 'node:fs/promises';
import lodash, { Dictionary } from 'lodash';

type Exception = (parts: [string, string]) => [string, string];

const WIKI_DOMAIN = 'https://overwatch.fandom.com';

const EXCEPTIONS: Dictionary<Exception> = {
  "Illari_-Everyone_keeps_asking_me_when_I_will_return._But_how_can_I,_after_everything_that's_happened.ogg": () => ['Illari', "Everyone_keeps_asking_me_when_I_will_return._But_how_can_I,_after_everything_that's_happened.ogg"],
  "Junkenstein'sRevenge.ogg": () => ['Reinhardt', "Junkenstein's_Revenge.ogg"],
  'Junker_Queen_(Announcer)': (parts) => ['Junker_Queen', parts[1]],
  'Junker_Queen_(NPC)': (parts) => ['Junker_Queen', parts[1]],
  'Junkrat_bacon_one_more_time.ogg': () => ['Junkrat', 'bacon_one_more_time.ogg'],
  'Kage_to_kieyo.ogg': () => ['Genji', 'Kage_to_kieyo.ogg'],
  'Mei_(Announcer)': (parts) => ['Mei', parts[1]],
  'Rein_Hewwo.ogg': () => ['Reinhardt', 'Hewwo.ogg'],
  'Roadhog_say_bacon_one_more_time.ogg': () => ['Roadhog', 'Say_bacon_one_more_time.ogg'],
  'Sombra_-(Spanish)_Not_bad.ogg': () => ['Sombra', '(Spanish)_Not_bad.ogg'],
  'Sombra_-Amateur_hour.ogg': () => ['Sombra', 'Amateur_hour.ogg'],
  "Sombra_-This_health_pack's_hacked.ogg": () => ['Sombra', "This_health_pack's_hacked.ogg"],
  'Winston_-Pardon_me.ogg': () => ['Winston', 'Pardon_me.ogg'],
  'Lucio': (parts) => ['Lúcio', parts[1]],
};

async function getQuotePages() {
  const response = await fetch(`${WIKI_DOMAIN}/wiki/Category:Quotations`);
  const dom = new JSDOM(await response.text());
  const document = dom.window.document;
  return Array.from(document.querySelectorAll('a'))
    .filter((a) => a.title.match(/\/Quotes$/))
    .map((a) => WIKI_DOMAIN + a.href);
}

async function getQuotes(page: string) {
  const response = await fetch(page);
  const dom = new JSDOM(await response.text());
  const document = dom.window.document;
  return Array.from(document.querySelectorAll('audio > source'))
    .map((source: HTMLSourceElement) => source.src);
}

async function getQuote(page: string) {
  const response = await fetch(page);
  const buffer = await response.arrayBuffer();
  const [folder, filename] = getFilenameParts(page)
  await fs.writeFile(`files/${folder}/${filename}`, Buffer.from(buffer));
}

function getFilenameParts(page: string) {
  const filename = decodeURIComponent(page.replace(/\/revision\/latest\?.+/, '').replace(/.+\//g, ''));
  const parts = filename.split('_-_') as [string, string];
  return EXCEPTIONS[parts[0]] ? EXCEPTIONS[parts[0]](parts) : parts
}

(async () => {
  const pages = await getQuotePages();

  let audioLinks: string[] = []
  for (const page of pages) {
    console.log(page);
    audioLinks = audioLinks.concat(await getQuotes(page));
  }

  audioLinks = audioLinks
    .filter((page) => !getFilenameParts(page)[0].startsWith('0000000'))
    .sort((a, b) => {
      const compare = getFilenameParts(a)[0].localeCompare(getFilenameParts(b)[0]);
      if (compare !== 0) return compare;
      return getFilenameParts(a)[1].localeCompare(getFilenameParts(b)[1]);
    });

  const folders = lodash.uniq(audioLinks.map((file) => getFilenameParts(file)[0]))
  for (const folder of folders) {
    await fs.mkdir(`files/${folder}`, { recursive: true }).catch((error) => {
      if (error.code !== 'EEXIST') throw error;
    });
  }

  for (const link of audioLinks) {
    console.log(link);
    await getQuote(link);
  }

})().catch((error) => console.error(error));
