// Généré par « npm run notes » depuis CHANGELOG.md : ne pas modifier à la main (#84).
/** @type {import('./types.js').Release[]} */
export const NOTES = [
  {
    version: "1.4.0",
    date: "2026-10-20",
    sections: [
      {
        title: "",
        items: [
          "Quand une nouvelle version a été téléchargée pendant que l'app est ouverte, un bouton « Mise à jour disponible » apparaît sous le chrono, avant la première reprise ou une fois l'assaut terminé, jamais pendant. Un toucher la prend aussitôt et affiche ses nouveautés.",
          "Sur un écran large (ordinateur, tablette en paysage), les réglages s'affichent en entier : le journal vocal, le partage des réglages et les mots appris étaient cachés à droite de la fenêtre.",
          "Sur un petit téléphone (Galaxy S7), la minute de repos tient à l'écran : « Reprise » ne passe plus sous les boutons du haut, ni le message entendu sous le bouton STOP.",
          "Le bouton « Exporter le journal » télécharge le fichier quand le téléphone refuse de le partager, au lieu de ne rien faire.",
          "« Copier le lien » des réglages dit « Copiez le lien ci-dessus » quand le téléphone refuse la copie, au lieu de ne rien faire.",
          "« Partager » des statistiques copie le texte quand le partage échoue, et dit « Échec du partage » si la copie échoue aussi.",
        ],
      },
    ],
  },
  {
    version: "1.3.2",
    date: "2026-10-19",
    sections: [
      {
        title: "",
        items: [
          "Reconnaissance : « Tireurs au centre, tireurs en garde, allez » et « Deuxième reprise, tireurs en garde » sont compris ; « hangar », « en garde » mal entendu de loin, aussi.",
        ],
      },
    ],
  },
  {
    version: "1.3.1",
    date: "2026-10-19",
    sections: [
      {
        title: "",
        items: [
          "Temps dépassé : après le premier « Temps », les rappels toutes les 5 s sont des bips, sans voix. Sur iPhone, chaque annonce coupait le micro un instant, et une phrase de l'arbitre dite à ce moment se perdait.",
        ],
      },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-10-19",
    sections: [
      {
        title: "",
        items: [
          "« Fin de l'assaut » termine l'assaut à tout moment : en reprise, en temps dépassé, pendant la minute de repos ou avant la reprise suivante. « Annuler » revient en arrière.",
        ],
      },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-10-19",
    sections: [
      {
        title: "",
        items: [
          "À chaque nouvelle version, l'écran titre revient une fois avec ce qui a changé.",
          "Dans les réglages, « À propos » donne la version et toutes les notes de version.",
          "Sur iPhone, une nouvelle version est prise à l'ouverture suivante de l'app, même si Safari a gardé l'onglet.",
        ],
      },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-10-19",
    sections: [
      {
        title: "",
        items: [
          "L'app s'ouvre aussi sans réseau, une fois ouverte une première fois : les boutons, la télécommande et les annonces marchent ; la reconnaissance vocale peut demander le réseau, selon le téléphone.",
          "Une nouvelle version se télécharge en arrière-plan, et elle est prise au prochain lancement de l'app : jamais pendant un assaut.",
        ],
      },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-10-19",
    sections: [
      {
        title: "Le chrono",
        items: [
          "Reprises, minute de repos, reprises supplémentaires et prolongation de 30 s, selon le règlement (cahier n°10), avec les préréglages par catégorie et phase.",
          "L'arbitre décide : après « temps », la reprise continue jusqu'à « Stop, fin de la reprise »",
          "Arrêts décomptés ou non, comptés et chronométrés ; annulation d'une commande parasite.",
          "Rappels à l'appel de la reprise, avec la sanction qui suit le rang du rappel.",
          "Pendant la minute de repos, ce que l'arbitre doit dire, sous le chrono.",
          "Chronomètre annexe : pour un retard, pénalité chaque minute et disqualification à 3 minutes ; pour un second exclu qui refuse de sortir, carton rouge à son tireur au bout d'une minute.",
          "Mode relais par équipes.",
          "Statistiques de l'assaut : arrêts, sanctions et points par tireur.",
        ],
      },
      {
        title: "La voix",
        items: [
          "Commandes à la voix de l'arbitre (« en garde, allez », « stop »…), sanctions reconnues avec la couleur du tireur, format de l'assaut dicté.",
          "Annonces vocales du repos, audibles pendant que le micro écoute ; réponse « Prêt » à « Chrono, prêt ? ».",
          "Micro relancé tout seul sur iPhone ; témoin « micro silencieux » et journal vocal exportable.",
        ],
      },
      {
        title: "L'écran",
        items: [
          "Thème jour / nuit automatique, et couleurs personnalisables",
          "En paysage, des chiffres plus grands ; et un mode tableau pour poser le téléphone face à l'aire",
          "Écran titre au premier lancement, et « Quoi de neuf » après une nouveauté importante.",
          "Télécommande Bluetooth : « suivant » = bouton principal, « précédent » = annuler.",
          "Réglages partagés par lien ou par fichier, vérifiés à l'import.",
          "Contrastes vérifiés dans les deux thèmes (chiffres en arrêt, boutons bleus la nuit), et boutons utilisables au clavier.",
        ],
      },
      {
        title: "Sécurité",
        items: [
          "Politique de sécurité du contenu : rien d'autre que les fichiers du site ne peut se charger ni s'exécuter.",
        ],
      },
    ],
  },
];
