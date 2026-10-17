// Écran titre au premier lancement (#6)
const { test, expect } = require('./fixtures');

test.describe('premier lancement', () => {
  test.use({ introSeen: false });

  test('l\'écran titre s\'affiche, « Commencer » active le micro, puis il ne revient plus', async ({ app, page }) => {
    const intro = page.locator('#intro');
    await expect(intro).toBeVisible();
    await expect(intro).toContainText('Chrono Canne');
    await expect(intro.locator('img')).toHaveAttribute('src', /logo\.svg$/);
    await page.locator('#introStart').click();
    await expect(intro).toBeHidden();
    await expect(page.locator('#micText')).toHaveText("À l'écoute");
    await page.reload();
    await expect(page.locator('#intro')).toBeHidden();
  });

  test('« Sans la voix » ferme l\'écran titre sans activer le micro', async ({ app, page }) => {
    await page.locator('#introSkip').click();
    await expect(page.locator('#intro')).toBeHidden();
    await expect(page.locator('#micText')).toHaveText('Micro coupé');
  });
});

test.describe('nouveauté importante depuis la dernière visite', () => {
  test.use({ introSeen: 1 });
  test('l\'écran titre revient une fois, avec « Quoi de neuf »', async ({ app, page }) => {
    await expect(page.locator('#intro')).toBeVisible();
    await expect(page.locator('#introNews')).toContainText('Quoi de neuf');
  });
});

test('accessible à nouveau depuis les réglages', async ({ app, page }) => {
  await app.$('#settingsBtn').click();
  await page.locator('#introAgain').click();
  await expect(page.locator('#intro')).toBeVisible();
  await expect(page.locator('#introNews')).toBeHidden();
});

test.describe('stockage indisponible (navigation privée stricte)', () => {
  test.use({ introSeen: false, blockStorage: true });
  test('l\'app démarre quand même, et l\'écran titre se ferme', async ({ app, page }) => {
    await page.locator('#introSkip').click();
    await expect(page.locator('#intro')).toBeHidden();
    await page.locator('#mainBtn').click();
    await expect(page.locator('#phaseLabel')).toHaveText('Assaut');
  });
});

test('icône et manifeste pour l\'écran d\'accueil', async ({ app, page }) => {
  for (const sel of ['link[rel="apple-touch-icon"]', 'link[rel="manifest"]', 'link[rel="icon"]']) {
    const href = await page.locator(sel).getAttribute('href');
    const r = await page.request.get(href);
    expect(r.ok(), sel).toBe(true);
  }
  const manifest = await (await page.request.get('manifest.webmanifest')).json();
  expect(manifest.name).toBe('Chrono Canne');
  expect(manifest.icons.map(i => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
});
