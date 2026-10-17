// Fenêtre de l'écran titre (#6). « Commencer » débloque le son et active le micro, en un seul toucher (exigence d'iOS).
import { $, $dialog } from './dom.js';
import { shouldShowIntro, whatsNew, readSeen, markSeen } from '../intro.js';

/** @param {{ storage: Storage | Pick<Storage, 'getItem' | 'setItem'>, onStart: () => void }} deps */
export function createIntro({ storage, onStart }) {
  /** @param {{ version: number, items: string[] }[]} news */
  function show(news) {
    $('introNews').hidden = !news.length;
    $('introNewsList').innerHTML = news.flatMap(n => n.items).map(t => `<li>${t}</li>`).join('');
    if (!$dialog('intro').open) $dialog('intro').showModal();
  }
  const close = () => { markSeen(storage); $dialog('intro').close(); };
  $('introStart').onclick = () => { close(); onStart(); };
  $('introSkip').onclick = close;
  $('introAgain').onclick = () => { $dialog('settings').close(); show([]); };
  const seen = readSeen(storage);
  if (shouldShowIntro(seen)) show(whatsNew(seen));
}
