// Protocole du chronométreur (cahier n°10, I 3.2.1 et I 3.2.2), piloté à la voix
const { test, expect } = require('./fixtures');

test('assaut complet en deux reprises, à la voix', async ({ app }) => {
  await app.configure({ sRounds: 2, sRound: '0:10', sRest: '0:40' });
  await expect(app.round).toHaveText('Reprise 1 / 2');
  await expect(app.time).toHaveText('0:10');

  // le chrono ne démarre qu'au « allez »
  await app.wait(3000);
  await expect(app.time).toHaveText('0:10');
  await app.hear('En garde, allez');
  await expect(app.phase).toHaveText('Assaut');
  await app.wait(4000);
  await expect(app.time).toHaveText('0:06');

  // fin du temps : gong + « Temps », puis attente du « stop » de l'arbitre
  await app.clearSounds();
  await app.wait(6000);
  expect(await app.sounds()).toContain(200);                // fondamentale du gong
  await app.wait(700);
  await app.expectSpoken('Temps');
  await expect(app.phase).toHaveText('Temps — attente du stop');
  await expect(app.main).toHaveText('STOP · REPOS');

  // « Stop, fin de la reprise » lance la minute de repos
  await app.hear('Stop, fin de la reprise');
  await expect(app.phase).toHaveText('Minute de repos');
  await expect(app.time).toHaveText('0:40');

  // annonces du repos : 30, 15, 5 secondes, puis « Temps »
  await app.clearSpoken();
  await app.wait(10_100);
  await app.expectSpoken('trente secondes');
  await app.wait(15_000);
  await app.expectSpoken('quinze secondes');
  await app.wait(10_000);
  await app.expectSpoken('cinq secondes');
  await app.clearSpoken();
  await app.wait(5000 + 700);
  await app.expectSpoken('Temps');

  // reprise 2, qui attend le « allez »
  await expect(app.round).toHaveText('Reprise 2 / 2');
  await expect(app.phase).toHaveText('Prêt — en garde');
  await expect(app.time).toHaveText('0:10');
  await app.hear('En garde, allez');
  await app.wait(10_700);
  await expect(app.main).toHaveText('STOP · FIN');

  // « Stop, fin de l'assaut » : annonce du résumé et statistiques
  await app.hear("Stop, fin de l'assaut");
  await expect(app.phase).toHaveText("Fin de l'assaut");
  await app.wait(1600);
  await app.expectSpoken("Fin de l'assaut. Aucun arrêt.");
  await expect(app.$('#statsDlg')).toBeVisible();
  await expect(app.$('#statsTitle')).toHaveText("Fin de l'assaut");
});

test("les boutons suivent le même protocole que la voix", async ({ app }) => {
  await app.configure({ sRounds: 1, sRound: '0:05' });
  await app.main.click();                                  // ALLEZ
  await app.wait(2000);
  await app.main.click();                                  // STOP
  await expect(app.phase).toHaveText('Arrêt');
  await app.wait(3000);
  await expect(app.time).toHaveText('0:03');              // arrêt décompté : le temps est figé
  await app.main.click();                                  // ALLEZ
  await app.wait(3700);
  await expect(app.main).toHaveText('STOP · FIN');
  await app.main.click();
  await expect(app.phase).toHaveText("Fin de l'assaut");
});

test('« Chrono, prêt ? » : l\'app répond « Prêt »', async ({ app }) => {
  await app.hear('Chrono, prêt ?');
  await app.expectSpoken('Prêt');
});

test("la phrase de l'arbitre règle le chrono, et l'app la confirme", async ({ app }) => {
  await app.hear('Pour un assaut en 4 reprises de 2 minutes, avec 1 minute de repos');
  await expect(app.round).toHaveText('Reprise 1 / 4');
  await expect(app.time).toHaveText('2:00');
  await app.expectSpoken('Compris. Un assaut en quatre reprises de deux minutes, avec une minute de repos.');

  await app.hear('Pour un assaut en 5 reprises de 2 minutes');
  await expect(app.round).toHaveText('Reprise 1 / 4');
  await app.expectSpoken('Quatre reprises au maximum');
});

test('le bouton 📣 annonce la phrase de l\'assaut', async ({ app }) => {
  await app.$('#announceBtn').click();
  await app.expectSpoken("Pour un assaut en trois reprises d'une minute trente, avec une minute de repos.");
});
