// Chronomètre annexe, second usage : un second exclu qui refuse de sortir (I 4.2.5.4, #9)
const { test, expect } = require('./fixtures');

test('second exclu : « Une minute. Carton rouge », et le carton est noté dans l\'assaut', async ({ app }) => {
  await app.hear('Allez');
  await app.wait(2000);
  await app.hear('Stop');
  await app.$('#annexBtn').click();
  await expect(app.$('#annexRetard')).toHaveAttribute('aria-pressed', 'true');
  await app.$('#annexSecond').click();
  await expect(app.$('#annexSecond')).toHaveAttribute('aria-pressed', 'true');
  await expect(app.$('#annexRetard')).toHaveAttribute('aria-pressed', 'false');
  await expect(app.$('#annexNote')).toContainText('carton rouge');
  await app.$('#annexStart').click();
  await app.wait(60_500);
  await app.expectSpoken('Une minute. Carton rouge');
  await expect(app.$('#annexTime')).toHaveText('1:00');
  await expect(app.$('#annexTime')).toHaveClass(/alert/);
  await app.$('#annexClose').click();
  await expect(app.heard).toHaveText('📝 Carton rouge (second exclu)');
  await app.$('#statsBtn').click();
  await expect(app.$('#statsBody')).toContainText('Carton rouge (second exclu)');
});

test('second exclu avant l\'assaut : annoncé, sans rien à quoi rattacher le carton', async ({ app }) => {
  await app.$('#annexBtn').click();
  await app.$('#annexSecond').click();
  await app.$('#annexStart').click();
  await app.wait(60_500);
  await app.expectSpoken('Une minute. Carton rouge');
  await app.$('#annexClose').click();
  await expect(app.heard).toHaveText('🔊 Une minute. Carton rouge');
});

test('changer d\'usage remet le chronomètre annexe à zéro', async ({ app }) => {
  await app.$('#annexBtn').click();
  await app.$('#annexStart').click();
  await app.wait(5000);
  await expect(app.$('#annexTime')).toHaveText('0:05');
  await app.$('#annexSecond').click();
  await expect(app.$('#annexTime')).toHaveText('0:00');
  await expect(app.$('#annexStart')).toHaveText('Démarrer');
  await app.$('#annexRetard').click();
  await expect(app.$('#annexNote')).toContainText('disqualification');
});
