// Mode jour / nuit et palette personnalisable (#5)
const { test, expect } = require('./fixtures');

const bg = page => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const theme = page => page.evaluate(() => document.documentElement.dataset.theme);

test('thème automatique : suit le réglage jour / nuit du téléphone', async ({ app, page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(() => theme(page)).toBe('jour');
  expect(await bg(page)).toBe('rgb(255, 255, 255)');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => theme(page)).toBe('nuit');
  expect(await bg(page)).toBe('rgb(13, 15, 18)');
});

test('thème choisi à la main : prioritaire sur le téléphone, et gardé après rechargement', async ({ app, page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await app.configure({ sTheme: 'nuit' });
  await expect.poll(() => theme(page)).toBe('nuit');
  await page.reload();
  await expect.poll(() => theme(page)).toBe('nuit');
});

test('palette personnalisée : appliquée, puis retour aux couleurs d\'origine', async ({ app, page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await app.configure({ 'sColor-round': '#00e676' });
  await app.hear('Allez');
  await app.wait(1000);
  await expect(app.time).toHaveCSS('color', 'rgb(0, 230, 118)');
  await app.$('#settingsBtn').click();
  await app.$('#paletteReset').click();
  await app.$('#saveBtn').click();
  await expect(app.time).toHaveCSS('color', 'rgb(255, 176, 32)');
});

test('avertissement de contraste pour une couleur peu lisible', async ({ app, page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await app.$('#settingsBtn').click();
  await expect(app.$('#contrastWarn')).toBeHidden();
  await app.$('#sColor-round').fill('#202020');
  await expect(app.$('#contrastWarn')).toBeVisible();
  await expect(app.$('#contrastWarn')).toContainText('Reprise');
});
