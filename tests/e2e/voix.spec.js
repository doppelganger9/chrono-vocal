// Reconnaissance des commandes : variantes, filtre « en garde », apprentissage
const { test, expect } = require('./fixtures');

test('les variantes de « allez » prononcé vite démarrent le chrono', async ({ app }) => {
  for (const variant of ['à les', "à l'est", 'aller']) {
    await app.hear(variant);
    await expect(app.phase).toHaveText('Assaut');
    await app.hear('Stop');
    await expect(app.phase).toHaveText('Arrêt');
  }
});

test('une alternative de la reconnaissance suffit', async ({ app }) => {
  await app.hear(['à la plage', 'allez']);
  await expect(app.phase).toHaveText('Assaut');
});

test('une phrase longue ne déclenche pas de commande', async ({ app }) => {
  await app.hear('il faut aller voir les juges tout de suite');
  await expect(app.phase).toHaveText('Prêt — en garde');
});

test('« en garde » obligatoire : « allez » seul est ignoré', async ({ app }) => {
  await app.configure({ sEnGarde: '1' });
  await app.hear('Allez');                                  // le public
  await expect(app.phase).toHaveText('Prêt — en garde');
  await expect(app.heard).toContainText('ALLEZ ignoré');

  await app.hear('En garde');
  await expect(app.phase).toHaveText('En garde');
  await app.wait(2000);
  await app.hear('Allez');
  await expect(app.phase).toHaveText('Assaut');

  await app.hear('Stop');
  await app.wait(11_000);                                   // « en garde » trop ancien
  await app.hear('Allez');
  await expect(app.phase).toHaveText('Arrêt');
  await app.hear('En garde, allez');                        // dans la même phrase
  await expect(app.phase).toHaveText('Assaut');
});

test('« en garde » obligatoire : les boutons ne sont pas filtrés', async ({ app }) => {
  await app.configure({ sEnGarde: '1' });
  await app.main.click();
  await expect(app.phase).toHaveText('Assaut');
});

test('apprendre une variante mal reconnue depuis les réglages', async ({ app }) => {
  await app.hear('Allô');
  await expect(app.phase).toHaveText('Prêt — en garde');
  await app.$('#settingsBtn').click();
  const row = app.$('#unheardList .learn-row', { hasText: 'Allô' });
  await row.getByRole('button', { name: 'ALLEZ' }).click();
  await expect(app.$('#learnedList')).toContainText('ALLEZ');
  await app.$('#closeBtn').click();
  await app.hear('Allô');
  await expect(app.phase).toHaveText('Assaut');
});

// #30 : sur iPhone, parler pendant que la reconnaissance écoute encore la même phrase bloquait le micro
test('« Chrono, prêt ? » : réponse une fois la phrase finie, puis l\'écoute est relancée', async ({ app }) => {
  const log = () => app.page.evaluate(() => window.__recLog.slice());
  const startsBefore = (await log()).filter(x => x === 'start').length;
  await app.hear('Chrono, prêt', { final: false });                     // résultat provisoire
  await expect(app.heard).toHaveText('🎙 Chrono, prêt ?');
  expect(await app.spoken()).not.toContain('Prêt');                       // pas de voix pendant que l'arbitre parle
  await app.hear('Chrono, prêt ?');                                      // la phrase est finie
  await app.expectSpoken('Prêt');
  await app.wait(500);
  await expect.poll(async () => (await log()).filter(x => x === 'start').length).toBe(startsBefore + 1); // écoute relancée
  expect((await app.spoken()).filter(t => t === 'Prêt')).toHaveLength(1); // une seule réponse

  // le micro répond toujours aux commandements
  await app.hear('Allez');
  await expect(app.phase).toHaveText('Assaut');
});

test('« Chrono, prêt ? » : si l\'écoute s\'arrête avant la fin de la phrase, la réponse est quand même donnée', async ({ app }) => {
  await app.hear('Chrono, prêt', { final: false });
  await app.page.evaluate(() => window.__rec.onend());                  // Safari coupe l'écoute après un silence
  await app.expectSpoken('Prêt');
  await app.hear('Allez');
  await expect(app.phase).toHaveText('Assaut');
});
