# Guide de la documentation

Ce répertoire gère la rédaction de la documentation, les règles de liaison Mintlify et la politique i18n de la documentation.

## Règles Mintlify

- Les docs sont hébergés sur Mintlify (`https://docs.openclaw.ai`).
- Les liens internes dans `docs/**/*.md` doivent rester relatifs à la racine sans suffixe `.md` ou `.mdx` (exemple : `[Config](/configuration)`).
- Les références croisées de section doivent utiliser des ancres sur les chemins relatifs à la racine (exemple : `[Hooks](/configuration#hooks)`).
- Les titres des documents doivent éviter les tirets longs et les apostrophes car la génération d'ancres de Mintlify est fragile à cet égard.
- Le README et les autres documents rendus par GitHub doivent conserver des URL de documentation absolues pour que les liens fonctionnent en dehors de Mintlify.
- Le contenu de la documentation doit rester générique : aucun nom d'appareil personnel, nom d'hôte ou chemin local ; utilisez des espaces réservés comme `user@gateway-host`.

## Règles de contenu de la documentation

- Pour la documentation, le texte de l'interface utilisateur et les listes de sélection, classez les services/fournisseurs par ordre alphabétique, sauf si la section décrit explicitement l'ordre d'exécution ou l'ordre de détection automatique.
- Gardez la dénomination des plugins groupés cohérente avec les règles de terminologie des plugins à l'échelle du dépôt dans le `AGENTS.md` racine.

## i18n de la documentation

- La documentation en langue étrangère n'est pas maintenue dans ce dépôt. La sortie de publication générée réside dans le dépôt séparé `openclaw/docs` (souvent cloné localement sous `../openclaw-docs`).
- N'ajoutez pas et ne modifiez pas de documents localisés sous `docs/<locale>/**` ici.
- Considérez la documentation en anglais dans ce dépôt ainsi que les fichiers de glossaire comme la source de vérité.
- Pipeline : mettez à jour la documentation en anglais ici, mettez à jour `docs/.i18n/glossary.<locale>.json` si nécessaire, puis laissez la synchronisation du dépôt de publication et `scripts/docs-i18n` s'exécuter dans `openclaw/docs`.
- Avant de relancer `scripts/docs-i18n`, ajoutez des entrées de glossaire pour tous les nouveaux termes techniques, titres de page ou étiquettes de navigation courtes qui doivent rester en anglais ou utiliser une traduction fixe.
- `pnpm docs:check-i18n-glossary` est la garde pour les titres de documentation en anglais modifiés et les étiquettes de documentation interne courtes.
- La mémoire de traduction réside dans les fichiers `docs/.i18n/*.tm.jsonl` générés dans le dépôt de publication.
- Voir `docs/.i18n/README.md`.
