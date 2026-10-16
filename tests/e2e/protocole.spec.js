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

  // fin du temps : gong + « Temps » ; la reprise continue jusqu'à la décision de l'arbitre
  await app.clearSounds();
  await app.wait(6000);
  expect(await app.sounds()).toContain(200);                // fondamentale du gong
  await app.wait(700);
  await app.expectSpoken('Temps');
  await expect(app.phase).toHaveText('Temps dépassé');
  await expect(app.time).toHaveText('+0:00');

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
  await expect(app.phase).toHaveText('Temps dépassé');
  await expect(app.$('#skipBtn')).toHaveText("Fin de l'assaut");

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
  await expect(app.phase).toHaveText('Temps dépassé');
  await app.$('#skipBtn').click();                         // « Fin de l'assaut »
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

// L'arbitre dirige, le chrono suit (backlog R1)
test.describe("l'arbitre décide de la fin de la reprise", () => {
  test.beforeEach(async ({ app }) => {
    await app.configure({ sRounds: 2, sRound: '0:10' });
    await app.hear('Allez');
  });

  test('après « temps », la reprise continue : le dépassement est compté et « Temps » répété toutes les 5 s', async ({ app }) => {
    await app.wait(10_700);
    await app.clearSpoken();
    await app.wait(4000);
    await expect(app.time).toHaveText('+0:04');
    expect(await app.spoken()).not.toContain('Temps');
    await app.wait(1000);
    await app.expectSpoken('Temps');                        // à +5 s
    await app.clearSpoken();
    await app.wait(5000);
    await app.expectSpoken('Temps');                        // à +10 s
    await app.hear('Stop, fin de la reprise');
    await expect(app.phase).toHaveText('Minute de repos');
    await app.$('#statsBtn').click();
    await expect(app.$('#statsBody')).toContainText('dépassé +0:11');   // 0,7 + 10 s
  });

  test('pendant le temps dépassé, « stop » seul est un arrêt, et « Temps » n\'est pas répété', async ({ app }) => {
    await app.wait(12_000);
    await app.hear('Stop');
    await expect(app.phase).toHaveText('Arrêt');
    await app.clearSpoken();
    await app.wait(10_000);
    expect(await app.spoken()).not.toContain('Temps');
    await expect(app.time).toHaveText('+0:02');             // arrêt décompté : le dépassement est figé
    await app.hear('Allez');
    await expect(app.phase).toHaveText('Temps dépassé');
    await app.hear("Stop, fin de l'assaut");                // les deux formules terminent la reprise
    await expect(app.phase).toHaveText('Minute de repos');
  });

  test('« stop » juste avant « temps » : « fin de la reprise » termine quand même la reprise', async ({ app }) => {
    await app.wait(9700);
    await app.hear('Stop');
    await expect(app.time).toHaveText('0:01');              // quelques dixièmes restent
    await app.hear('En garde, allez');
    await app.hear('Stop, fin de la reprise');
    await expect(app.phase).toHaveText('Minute de repos');
  });

  test('un commandement sans effet est signalé', async ({ app }) => {
    await app.hear('Stop, fin de la reprise');
    await app.hear('Stop, fin de la reprise');              // déjà en minute de repos
    await expect(app.heard).toContainText('sans effet');
  });
});
