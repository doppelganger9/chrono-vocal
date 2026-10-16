// Arrêts de l'arbitre : décompte, prolongation, annulation, statistiques
const { test, expect } = require('./fixtures');

test('arrêts décomptés : le chrono est figé, et chaque arrêt est compté', async ({ app }) => {
  await app.configure({ sRounds: 1, sRound: '0:20' });
  await app.hear('Allez');
  await app.wait(2000);
  await app.hear('Stop');
  await expect(app.phase).toHaveText('Arrêt');
  await app.wait(5000);
  await expect(app.time).toHaveText('0:18');
  await expect(app.stops).toHaveText('Arrêt 1 · 0:05');
  await app.hear('Allez');
  await expect(app.stops).toHaveText('1 arrêt · 0:05');

  await app.wait(3000);
  await app.hear('Stop');
  await app.wait(2000);
  await app.hear('Allez');
  await expect(app.stops).toHaveText('2 arrêts · 0:07');

  // fin de l'assaut : résumé vocal et statistiques
  await app.wait(15_000);
  await app.hear("Stop, fin de l'assaut");
  await app.wait(1600);
  await app.expectSpoken("Fin de l'assaut. 2 arrêts, sept secondes d'arrêt au total.");
  const tiles = app.$('#statsBody .tile b');
  await expect(tiles.nth(0)).toHaveText('2');      // arrêts
  await expect(tiles.nth(1)).toHaveText('0:07');   // temps d'arrêt total
  await expect(tiles.nth(3)).toHaveText('0:05');   // arrêt le plus long
});

test('arrêts non décomptés : le chrono continue, prolongation automatique de 30 s après un arrêt long', async ({ app }) => {
  await app.configure({ sRounds: 1, sRound: '1:00', sCount: '0', sProlong: 'auto' });
  await app.hear('Allez');
  await app.wait(2000);
  await app.hear('Stop');
  await app.wait(5000);
  await expect(app.time).toHaveText('0:53');                  // le temps a continué
  await expect(app.stops).toContainText('(non décompté)');
  await app.hear('Allez');                                    // arrêt de 5 s : pas de prolongation
  await expect(app.max).toHaveText('/ 1:00');

  await app.hear('Stop');
  await app.wait(31_000);
  await app.hear('Allez');                                    // arrêt de 31 s : +30 s
  await app.expectSpoken('Prolongation de trente secondes');
  await expect(app.max).toHaveText('/ 1:30');
  await expect(app.time).toHaveText('0:52');                  // 60 - 38 + 30
  await expect(app.stops).toContainText('prolongation +30 s');

  await app.hear('Stop');                                     // une seule prolongation par reprise
  await app.wait(31_000);
  await app.hear('Allez');
  await expect(app.max).toHaveText('/ 1:30');
});

test('annuler un STOP parasite : le chrono a continué de tourner, l\'arrêt disparaît', async ({ app }) => {
  await app.configure({ sRounds: 1, sRound: '0:20' });
  await app.hear('Allez');
  await app.wait(1000);
  await app.hear('Stop');
  await app.wait(2000);
  await expect(app.$('#undoBtn')).toHaveText('↶ Annuler STOP');
  await app.$('#undoBtn').click();
  await app.wait(100);
  await expect(app.time).toHaveText('0:17');
  await expect(app.phase).toHaveText('Assaut');
  await expect(app.stops).toHaveText('');
});

test('annuler un ALLEZ parasite : l\'arrêt continue et dure jusqu\'au vrai ALLEZ', async ({ app }) => {
  await app.configure({ sRounds: 1, sRound: '0:20' });
  await app.hear('Allez');
  await app.wait(1000);
  await app.hear('Stop');
  await app.wait(1000);
  await app.hear('Allez');           // venu d'une aire voisine
  await app.wait(2000);
  await app.$('#undoBtn').click();
  await expect(app.phase).toHaveText('Arrêt');
  await expect(app.time).toHaveText('0:19');
  await app.wait(1000);
  await expect(app.stops).toHaveText('Arrêt 1 · 0:04');
});

test('motifs des arrêts : sanctions reconnues à la voix, par tireur', async ({ app }) => {
  await app.configure({ sRounds: 1, sRound: '0:30' });
  await app.hear('Allez');
  await app.wait(2000);
  await app.hear('Stop');
  await app.hear("Pénalité pour sortie d'aire, tireur bleu");
  await expect(app.heard).toHaveText("📝 Pénalité (sortie d'aire) bleu");
  await app.hear('Allez');
  await app.wait(2000);
  await app.hear('Stop');
  await app.hear('Avertissement prononcé, tireur rouge');
  await app.hear('Carton rouge au tireur bleu');
  await app.hear('Allez');

  await app.$('#statsBtn').click();
  const rows = app.$('#statsBody table').last().locator('tr');
  await expect(rows.nth(1)).toContainText('rouge');
  await expect(rows.nth(1).locator('td').last()).toHaveText('2');   // avertissement : 2 points à l'adversaire
  await expect(rows.nth(2)).toContainText('bleu');
  await expect(rows.nth(2).locator('td').last()).toHaveText('3');   // pénalité 1 + carton 2
  await expect(app.$('#statsBody')).toContainText("Pénalité (sortie d'aire) bleu");
});

test('prolongation proposée (par défaut) : l\'arbitre décide d\'un toucher', async ({ app }) => {
  await app.configure({ sRounds: 1, sRound: '1:00', sCount: '0' });
  await app.hear('Allez');
  await app.hear('Stop');
  await app.wait(31_000);
  await app.hear('Allez');
  const offer = app.$('#prolongBtn');
  await expect(offer).toBeVisible();
  await expect(app.max).toHaveText('/ 1:00');              // rien n'est appliqué d'office
  await offer.click();
  await app.expectSpoken('Prolongation de trente secondes');
  await expect(app.max).toHaveText('/ 1:30');
  await expect(offer).toBeHidden();
});

test('prolongation proposée puis ignorée : la proposition disparaît après 15 s', async ({ app }) => {
  await app.configure({ sRounds: 1, sRound: '1:00', sCount: '0' });
  await app.hear('Allez');
  await app.hear('Stop');
  await app.wait(31_000);
  await app.hear('Allez');
  await expect(app.$('#prolongBtn')).toBeVisible();
  await app.wait(15_500);
  await expect(app.$('#prolongBtn')).toBeHidden();
  await expect(app.max).toHaveText('/ 1:00');
});
