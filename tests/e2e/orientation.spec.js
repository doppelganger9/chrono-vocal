// Portrait et paysage (#4) : la mise en page tire parti du format de l'écran
const { test, expect } = require('./fixtures');

const SIZES = {
  'iPhone SE portrait': { width: 375, height: 667 },
  'iPhone SE paysage': { width: 667, height: 375 },
  'iPhone Pro Max portrait': { width: 430, height: 932 },
  'iPhone Pro Max paysage': { width: 932, height: 430 },
  'Android portrait': { width: 412, height: 915 },
  'Android paysage': { width: 915, height: 412 },
};
const box = (page, sel) => page.locator(sel).boundingBox();
const noScroll = page => page.evaluate(() => document.scrollingElement.scrollHeight <= innerHeight + 1 && document.scrollingElement.scrollWidth <= innerWidth + 1);

for (const [name, size] of Object.entries(SIZES)) {
  test(`${name} : tout tient sans défilement, chrono et bouton principal visibles`, async ({ app, page }) => {
    await page.setViewportSize(size);
    await app.hear('Allez');
    await app.wait(2000);
    expect(await noScroll(page)).toBe(true);
    for (const sel of ['#time', '#mainBtn', '#roundLabel', '#micBtn']) await expect(page.locator(sel)).toBeInViewport();
  });
}

for (const name of ['iPhone SE paysage', 'iPhone Pro Max paysage', 'Android paysage']) {
  test(`${name} : chiffres d'au moins 40 % de la hauteur, boutons en colonne à droite`, async ({ app, page }) => {
    await page.setViewportSize(SIZES[name]);
    await app.hear('Allez');
    await app.wait(2000);
    const time = await box(page, '#time'), main = await box(page, '#mainBtn'), skip = await box(page, '#skipBtn');
    expect(time.height / SIZES[name].height).toBeGreaterThanOrEqual(0.4);
    expect(main.x).toBeGreaterThan(time.x + time.width);         // boutons à droite du chrono
    expect(skip.y).toBeGreaterThan(main.y);                       // en colonne
    // le temps dépassé, plus large, tient aussi
    await app.wait(90_000);
    await expect(app.time).toHaveText(/^\+/);
    expect(await noScroll(page)).toBe(true);
  });
}

test('mode tableau (option) : en paysage, le chrono seul ; un toucher affiche les boutons', async ({ app, page }) => {
  await page.setViewportSize(SIZES['iPhone Pro Max paysage']);
  await app.configure({ sBoard: '1' });
  await expect(page.locator('.controls')).toBeHidden();
  const time = await box(page, '#time');
  expect(time.height / SIZES['iPhone Pro Max paysage'].height).toBeGreaterThanOrEqual(0.5);
  await app.hear('Allez');                                       // la voix pilote toujours
  await expect(app.phase).toHaveText('Assaut');
  await expect(page.locator('.bar')).toBeInViewport();           // tout l'écran tient, barre comprise
  expect(await noScroll(page)).toBe(true);
  await page.locator('main').click();
  await expect(page.locator('#mainBtn')).toBeVisible();
  await app.wait(9000);
  await expect(page.locator('.controls')).toBeHidden();         // repli au bout de 8 s
});

test('mode tableau : sans effet en portrait', async ({ app, page }) => {
  await page.setViewportSize(SIZES['iPhone Pro Max portrait']);
  await app.configure({ sBoard: '1' });
  await expect(page.locator('#mainBtn')).toBeVisible();
});

test('réglages en paysage : sur deux colonnes, sans dépasser l\'écran en largeur', async ({ app, page }) => {
  await page.setViewportSize(SIZES['iPhone Pro Max paysage']);
  await app.$('#settingsBtn').click();
  const a = await box(page, '#sMode'), b = await box(page, '#sCount');
  expect(Math.abs(a.x - b.x)).toBeGreaterThan(100);              // pas dans la même colonne
  const dlg = await box(page, '#settings');
  expect(dlg.x + dlg.width).toBeLessThanOrEqual(SIZES['iPhone Pro Max paysage'].width);
});
