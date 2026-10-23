#!/bin/sh
# Démarrage d'une session de Claude Code dans le cloud (crochet SessionStart de .claude/settings.json, rétro du
# 23 octobre 2026, A2). Sur le Mac, il ne fait rien : la variable CLAUDE_CODE_REMOTE n'existe que dans le cloud.
# Ce qu'il écrit est lu par Claude au début de la session.
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 0

if [ ! -d node_modules ]; then
  if npm ci --no-audit --no-fund >/dev/null 2>&1; then
    echo "Dépendances installées (npm ci)."
  else
    echo "npm ci a échoué : le relancer à la main pour voir l'erreur."
  fi
fi

cat <<'EOF'
Session dans le cloud (scripts/session-cloud.sh) :
- Playwright prend le Chromium préinstallé (/opt/pw-browsers/chromium) ; WebKit (iphone-safari) n'est pas dans le conteneur, il est sauté et la CI le vérifie. `npm run verifier -- --complet` marche tel quel et le dit dans son résumé.
- Les captures (`npm run avant-apres`) sont toutes rendues par Chromium, iPhone compris.
- `npm run ai-stats` lit le journal de session du Mac : ici, ne donner que la durée du fil.
EOF
