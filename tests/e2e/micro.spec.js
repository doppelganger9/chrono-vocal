// Micro figé après les annonces sur iPhone (#45) : l'écoute est relancée après chaque annonce (iOS seulement :
// sur Android, chaque démarrage de la reconnaissance fait un bip), et l'anti-écho ne filtre que la voix de l'app.
const { test, expect } = require('./fixtures');

const recognizers = app => app.page.evaluate(() => window.__recLog.filter(x => x === 'new').length);
const journal = app => app.page.evaluate(() => JSON.parse(localStorage.getItem('chrono-canne-journal') || '[]'));

test('après « Temps », les annonces du repos et la fin du repos, la voix commande toujours', async ({ app, browserName }) => {
  const ios = browserName === 'webkit';
  await app.configure({ sRounds: 2, sRound: '0:05' });
  await app.hear('Allez');
  let n = await recognizers(app);
  await app.wait(6000);                                        // gong, « Temps »
  await app.expectSpoken('Temps');
  await app.wait(500);                                         // la relance part au pas d'horloge suivant
  expect(await recognizers(app)).toBe(ios ? n + 1 : n);        // iPhone : reconnaissance neuve après l'annonce
  await app.hear('Stop, fin de la reprise');
  await expect(app.phase).toHaveText('Minute de repos');

  n = await recognizers(app);
  await app.wait(31_000);                                      // « trente secondes »
  await app.expectSpoken('trente secondes');
  await app.wait(500);
  expect(await recognizers(app)).toBe(ios ? n + 1 : n);
  await app.wait(30_000);                                      // fin du repos : « Temps »
  await expect(app.phase).toHaveText('Prêt — en garde');
  await app.hear('En garde, allez');
  await expect(app.phase).toHaveText('Assaut');
});

test('temps dépassé : « Stop, fin de la reprise » dit pendant « Temps » est pris en compte', async ({ app }) => {
  await app.configure({ sRounds: 2, sRound: '0:05' });
  await app.hear('Allez');
  await app.page.evaluate(() => { window.__speechMs = 1500; });  // l'annonce dure 1,5 s
  await app.wait(10_500);                                      // temps dépassé : « Temps » répété à +5 s
  await expect(app.phase).toHaveText('Temps dépassé');
  await app.page.evaluate(() => { window.__spoken.length = 0; });
  await app.wait(5000);
  await app.expectSpoken('Temps');                             // l'app est en train de dire « Temps »
  await app.hear('Stop, fin de la reprise');
  await expect(app.phase).toHaveText('Minute de repos');
});

test('anti-écho : pendant une annonce, l\'app ignore sa propre voix, pas celle de l\'arbitre', async ({ app }) => {
  await app.configure({ sRounds: 2, sRound: '0:05' });
  await app.hear('Allez');
  await app.page.evaluate(() => { window.__speechMs = 1500; });
  await app.wait(6000);                                        // « Temps », 0,6 s après le gong
  await app.hear('Temps');                                     // le micro entend l'annonce
  expect((await journal(app)).some(e => e.alts?.[0] === 'Temps'), 'écho ignoré').toBe(false);
});

test('la relance attend la fin de la phrase de l\'arbitre (iPhone)', async ({ app, browserName }) => {
  test.skip(browserName !== 'webkit', 'relance après chaque annonce : iOS seulement');
  await app.configure({ sRounds: 2, sRound: '0:05' });
  await app.hear('Allez');
  await app.page.evaluate(() => { window.__speechMs = 1500; });
  await app.wait(6000);                                        // « Temps » commence
  const n = await recognizers(app);
  await app.hear('Stop, fin de', { final: false });            // l'arbitre parle pendant l'annonce
  await app.wait(2500);                                        // l'annonce est finie, la phrase non
  expect(await recognizers(app), 'pas de relance au milieu de la phrase').toBe(n);
  await app.hear('Stop, fin de la reprise');
  await expect(app.phase).toHaveText('Minute de repos');
  await app.wait(1000);
  expect(await recognizers(app)).toBe(n + 1);
});
