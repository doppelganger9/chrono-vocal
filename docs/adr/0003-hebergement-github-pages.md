---
status: accepted
---

# Hébergement sur GitHub Pages, depuis un dépôt public

L'app est publiée par **GitHub Pages** depuis la branche `main` du dépôt public `doppelganger9/chrono-vocal` : https://doppelganger9.github.io/chrono-vocal/. C'est gratuit, en HTTPS (indispensable pour le micro, voir [ADR 0002](0002-app-web-et-voix-du-navigateur.md)), avec une adresse fixe, et chaque `git push` met le site à jour en une minute environ.

## Options écartées

- **Dépôt privé** : GitHub Pages sur un dépôt privé demande un compte payant.
- **Netlify, Vercel ou un serveur perso** : possibles, mais un compte et un outil de plus, sans gain pour une page statique.

## Conséquences

- Tout ce qui est dans le dépôt est public : le code, l'historique, les issues. Les commits utilisent l'adresse GitHub masquée (`…@users.noreply.github.com`, réglée dans la configuration git locale du dépôt), et rien de personnel n'est commité.
- Tous les fichiers du dépôt sont servis par le site, y compris les tests et la documentation. C'est sans risque pour ce contenu.
