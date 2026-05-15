# Guide de la documentation

Ce répertoire gère la rédaction de la documentation, les règles de liens Mintlify et la politique i18n de la documentation.

## Règles Mintlify

- La documentation est hébergée sur Mintlify (`https://docs.openclaw.ai`).
- Les liens de documentation internes dans `docs/**/*.md` doivent rester relatifs à la racine sans suffixe `.md` ni `.mdx` (exemple : `[Config](/gateway/configuration)`).
- Les références croisées de section doivent utiliser des ancres sur les chemins relatifs à la racine (exemple : `[Hooks](/gateway/configuration-reference#hooks)`).
- Les titres de la documentation doivent éviter les tirets longs (cadratins) et les apostrophes car la génération d'ancres de Mintlify est fragile à cet égard.
- Les README et autres documents rendus par GitHub doivent conserver des URL absolues de documentation pour que les liens fonctionnent en dehors de Mintlify.
- Le contenu de la documentation doit rester générique : aucun nom d'appareil personnel, nom d'hôte ou chemin local ; utilisez des espaces réservés comme `user@gateway-host`.

## Règles de contenu de la documentation

- Pour la documentation, les textes de l'interface utilisateur et les listes de sélection, classez les services/fournisseurs par ordre alphabétique, sauf si la section décrit explicitement l'ordre d'exécution ou l'ordre de détection automatique.
- Conservez une cohérence dans la nomination des plugins fournis (bundled) avec les règles de terminologie des plugins à l'échelle du dépôt dans le `AGENTS.md` à la racine.

## Documentation interne

- La documentation privée des opérateurs à long terme appartient à `~/Projects/manager/docs/`.
- La documentation interne de brouillon/miroir locale au dépôt peut résider sous `docs/internal/` ignoré.
- N'ajoutez jamais de pages `docs/internal/**` à la navigation `docs/docs.json` ni ne liez-les depuis la documentation publique.
- `scripts/docs-sync-publish.mjs` exclut et supprime `docs/internal/**` du dépôt de publication public `openclaw/docs` si une page est ajoutée de force ultérieurement.
- La documentation interne peut mentionner les chemins du dépôt, les noms des applications privées, les noms d'éléments 1Password et les runbooks, mais ne doit jamais inclure de valeurs secrètes.

## Docs i18n

- La documentation en langue étrangère n'est pas maintenue dans ce dépôt. La sortie de publication générée réside dans le dépôt distinct `openclaw/docs` (souvent cloné localement sous `../openclaw-docs`).
- N'ajoutez ni ne modifiez de documentation localisée sous `docs/<locale>/**` ici.
- Considérez la documentation en anglais dans ce dépôt ainsi que les fichiers de glossaire comme source de vérité.
- Pipeline : mettez à jour la documentation en anglais ici, mettez à jour `docs/.i18n/glossary.<locale>.json` si nécessaire, puis laissez la synchronisation du dépôt de publication et `scripts/docs-i18n` s'exécuter dans `openclaw/docs`.
- Avant de réexécuter `scripts/docs-i18n`, ajoutez des entrées de glossaire pour tout nouveau terme technique, titre de page ou étiquette de navigation courte qui doit rester en anglais ou utiliser une traduction fixe.
- `pnpm docs:check-i18n-glossary` est le garde-fou pour les titres de documentation anglais modifiés et les étiquettes de documentation interne courtes.
- La mémoire de traduction réside dans les fichiers `docs/.i18n/*.tm.jsonl` générés dans le dépôt de publication.
- Voir `docs/.i18n/README.md`.
