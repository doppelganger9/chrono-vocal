// Formats d'assaut : préréglages, reprises supplémentaires, relais, réglages enregistrés
const { test, expect } = require('./fixtures');

test('préréglage « Seniors, finales » : 4 × 2\'', async ({ app }) => {
  await app.configure({ sPreset: 'senf' });
  await expect(app.round).toHaveText('Reprise 1 / 4');
  await expect(app.time).toHaveText('2:00');
});

test('le nombre de reprises est limité à 4', async ({ app }) => {
  await app.$('#settingsBtn').click();
  await expect(app.$('#sRounds option')).toHaveText(['1', '2', '3', '4']);
});

test('reprise supplémentaire en cas d\'égalité, après une minute de repos', async ({ app }) => {
  await app.configure({ sRounds: 1, sRound: '0:05', sExtra: '1' });
  await app.hear('Allez');
  await app.wait(5700);
  await app.hear("Stop, fin de l'assaut");
  await expect(app.main).toHaveText('REPRISE SUPPL.');
  await app.wait(1600);                                    // les statistiques s'ouvrent
  await app.$('#closeStats').click();
  await app.main.click();
  await expect(app.phase).toHaveText('Minute de repos');
  await expect(app.time).toHaveText('1:00');
  await app.wait(60_700);
  await expect(app.round).toHaveText('Reprise supplémentaire 1');
  await expect(app.time).toHaveText('0:05');
  await app.hear('Allez');
  await app.wait(5700);
  await app.hear("Stop, fin de l'assaut");
  await expect(app.main).toHaveText('Terminé');           // une seule reprise supplémentaire autorisée
  await expect(app.main).toBeDisabled();
});

test('relais : reprise unique = base × équipiers × 2, « Relais » chaque minute', async ({ app }) => {
  await app.configure({ sMode: 'relais', sRelayBase: '60', sRelayCount: '2' });
  await expect(app.round).toHaveText('Relais — reprise unique');
  await expect(app.time).toHaveText('4:00');
  await app.hear('Allez');
  await app.wait(60_000);
  await app.expectSpoken('Relais');
  await expect(app.stops).toHaveText('🔁 Relais · 0:10');
  await app.wait(10_500);
  await expect(app.stops).toHaveText('');
});

test('chronomètre annexe : pénalité chaque minute, disqualification à 3 minutes', async ({ app }) => {
  await app.$('#annexBtn').click();
  await app.$('#annexStart').click();
  await app.wait(60_500);
  await app.expectSpoken('une minute. Pénalité');
  await app.wait(120_000);
  await app.expectSpoken('Trois minutes. Disqualification');
  await expect(app.$('#annexTime')).toHaveText('3:00');
  await expect(app.$('#annexTime')).toHaveClass(/alert/);
});

test('les réglages sont gardés après rechargement', async ({ app, page }) => {
  await app.configure({ sRounds: 4, sRound: '2:00', sColor1: 'vert' });
  await page.reload();
  await expect(app.round).toHaveText('Reprise 1 / 4');
  await expect(app.time).toHaveText('2:00');
});

test.describe('anciens réglages enregistrés sur le téléphone', () => {
  test.use({ savedSettings: { rounds: 5, roundSec: 120, restSec: 60, calls: [15, 10, 5], colors: ['jaune', 'bleu'] } });

  test('sont mis à jour : 4 reprises max, annonces 30/15/5, couleurs rouge et bleu', async ({ app }) => {
    await expect(app.round).toHaveText('Reprise 1 / 4');
    await app.$('#settingsBtn').click();
    await expect(app.$('#sCalls')).toHaveValue('30,15,5');
    await expect(app.$('#sColor1')).toHaveValue('rouge');
    await expect(app.$('#sColor2')).toHaveValue('bleu');
  });
});
