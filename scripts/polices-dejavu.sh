#!/bin/sh
# Polices DejaVu dans l'image de Playwright, comme sur un runner Ubuntu de GitHub (#131, ADR 0008). Sans elles, la
# police large des tests de mise en page (« DejaVu Sans ») retombe sur une autre, et le rendu change d'un pixel.
# Mêmes fichiers que le paquet fonts-dejavu-core d'Ubuntu 24.04, pris dans le paquet npm dejavu-fonts-ttf : pas d'apt-get.
# Après npm ci, dans le conteneur (root).
set -eu
d=node_modules/dejavu-fonts-ttf
mkdir -p /usr/share/fonts/truetype/dejavu
for f in DejaVuSans DejaVuSans-Bold DejaVuSansMono DejaVuSansMono-Bold DejaVuSerif DejaVuSerif-Bold; do
  cp "$d/ttf/$f.ttf" /usr/share/fonts/truetype/dejavu/
done
cp "$d"/fontconfig/*.conf /etc/fonts/conf.d/
fc-cache -f
fc-match "DejaVu Sans"
