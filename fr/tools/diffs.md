---
title: "Diffs"
summary: "Visualiseur de diffs en lecture seule et générateur de fichiers pour les agents (tool de plugin optionnel)"
description: "Utilisez le plugin optionnel Diffs pour afficher le texte avant et après ou les correctifs unifiés sous la forme d'une vue de diff hébergée par la passerelle, d'un fichier (PNG ou PDF), ou des deux."
read_when:
  - You want agents to show code or markdown edits as diffs
  - You want a canvas-ready viewer URL or a rendered diff file
  - You need controlled, temporary diff artifacts with secure defaults
---

# Diffs

`diffs` est un tool de plugin optionnel avec des instructions système intégrées courtes et une compétence associée qui transforme le contenu des modifications en un artefact de diff en lecture seule pour les agents.

Il accepte soit :

- du texte `before` et `after`
- un `patch` unifié

Il peut renvoyer :

- une URL de visualiseur de passerelle pour la présentation sur canvas
- un chemin de fichier rendu (PNG ou PDF) pour la remise de message
- les deux sorties en un seul appel

Lorsqu'il est activé, le plugin préfixe des conseils d'utilisation concis dans l'espace du système (system-prompt) et expose également une compétence détaillée pour les cas où l'agent a besoin d'instructions plus complètes.

## Quick start

1. Activez le plugin.
2. Appelez `diffs` avec `mode: "view"` pour les flux privilégiant le canvas.
3. Appelez `diffs` avec `mode: "file"` pour les flux de remise de fichiers de chat.
4. Appelez `diffs` avec `mode: "both"` lorsque vous avez besoin des deux artefacts.

## Activer le plugin

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
      },
    },
  },
}
```

## Désactiver les instructions système intégrées

Si vous souhaitez garder le tool `diffs` activé mais désactiver ses instructions système intégrées (system-prompt), définissez `plugins.entries.diffs.hooks.allowPromptInjection` sur `false` :

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        hooks: {
          allowPromptInjection: false,
        },
      },
    },
  },
}
```

Cela bloque le hook `before_prompt_build` du plugin diffs tout en gardant le plugin, le tool et la compétence associée disponibles.

Si vous souhaitez désactiver à la fois les instructions et le tool, désactivez plutôt le plugin.

## Workflow typique de l'agent

1. L'agent appelle `diffs`.
2. L'agent lit les champs `details`.
3. L'agent effectue l'une des actions suivantes :
   - ouvre `details.viewerUrl` avec `canvas present`
   - envoie `details.filePath` avec `message` en utilisant `path` ou `filePath`
   - fait les deux

## Exemples d'entrée

Avant et après :

```json
{
  "before": "# Hello\n\nOne",
  "after": "# Hello\n\nTwo",
  "path": "docs/example.md",
  "mode": "view"
}
```

Correctif :

```json
{
  "patch": "diff --git a/src/example.ts b/src/example.ts\n--- a/src/example.ts\n+++ b/src/example.ts\n@@ -1 +1 @@\n-const x = 1;\n+const x = 2;\n",
  "mode": "both"
}
```

## Référence de l'entrée de l'outil

Tous les champs sont facultatifs, sauf indication contraire :

- `before` (`string`) : texte original. Requis avec `after` lorsque `patch` est omis.
- `after` (`string`) : texte mis à jour. Requis avec `before` lorsque `patch` est omis.
- `patch` (`string`) : texte de diff unifié. Mutuellement exclusif avec `before` et `after`.
- `path` (`string`) : nom de fichier à afficher pour le mode avant et après.
- `lang` (`string`) : indication de substitution de langue pour le mode avant et après.
- `title` (`string`) : substitution du titre de la visionneuse.
- `mode` (`"view" | "file" | "both"`) : mode de sortie. La valeur par défaut est celle du plugin `defaults.mode`.
- `theme` (`"light" | "dark"`) : thème de la visionneuse. La valeur par défaut est celle du plugin `defaults.theme`.
- `layout` (`"unified" | "split"`) : mise en page de la diff. La valeur par défaut est celle du plugin `defaults.layout`.
- `expandUnchanged` (`boolean`) : développer les sections inchangées lorsque le contexte complet est disponible. Option par appel uniquement (pas une clé par défaut du plugin).
- `fileFormat` (`"png" | "pdf"`) : format de fichier rendu. La valeur par défaut est celle du plugin `defaults.fileFormat`.
- `fileQuality` (`"standard" | "hq" | "print"`) : préréglage de qualité pour le rendu PNG ou PDF.
- `fileScale` (`number`) : substitution de l'échelle de l'appareil (`1`-`4`).
- `fileMaxWidth` (`number`) : largeur maximale de rendu en pixels CSS (`640`-`2400`).
- `ttlSeconds` (`number`) : durée de vie (TTL) de l'artefact de visualisation en secondes. Par défaut 1800, maximum 21600.
- `baseUrl` (`string`) : substitution de l'origine de l'URL du visualiseur. Doit être `http` ou `https`, sans requête/hash.

Validation et limites :

- `before` et `after` chacun 512 Ko maximum.
- `patch` 2 Mo maximum.
- `path` 2048 octets maximum.
- `lang` 128 octets maximum.
- `title` 1024 octets maximum.
- Limite de complexité du correctif : 128 fichiers maximum et 120 000 lignes au total.
- `patch` et `before` ou `after` ensemble sont rejetés.
- Limites de sécurité des fichiers rendus (s'appliquent au PNG et PDF) :
  - `fileQuality: "standard"` : 8 MP maximum (8 000 000 pixels rendus).
  - `fileQuality: "hq"` : 14 MP maximum (14 000 000 pixels rendus).
  - `fileQuality: "print"` : 24 MP maximum (24 000 000 pixels rendus).
  - Le PDF a également un maximum de 50 pages.

## Contrat des détails de sortie

L'outil renvoie des métadonnées structurées sous `details`.

Champs partagés pour les modes qui créent un visualiseur :

- `artifactId`
- `viewerUrl`
- `viewerPath`
- `title`
- `expiresAt`
- `inputKind`
- `fileCount`
- `mode`

Champs de fichier lors du rendu PNG ou PDF :

- `filePath`
- `path` (même valeur que `filePath`, pour la compatibilité avec l'outil de message)
- `fileBytes`
- `fileFormat`
- `fileQuality`
- `fileScale`
- `fileMaxWidth`

Résumé du comportement du mode :

- `mode: "view"` : champs du visualiseur uniquement.
- `mode: "file"` : champs de fichier uniquement, aucun artefact de visualiseur.
- `mode: "both"` : champs du visualiseur plus champs de fichier. Si le rendu du fichier échoue, le visualiseur renvoie quand même `fileError`.

## Sections inchangées réduites

- Le visualiseur peut afficher des lignes comme `N unmodified lines`.
- Les commandes d'extension sur ces lignes sont conditionnelles et ne sont pas garanties pour chaque type d'entrée.
- Les commandes d'extension apparaissent lorsque le diff rendu contient des données de contexte extensibles, ce qui est typique pour les entrées avant et après.
- Pour de nombreuses entrées de correctif unifié, les corps de contexte omis ne sont pas disponibles dans les blocs de correctif analysés, la ligne peut donc apparaître sans commandes d'extension. Ce comportement est attendu.
- `expandUnchanged` s'applique uniquement lorsqu'un contexte extensible existe.

## Valeurs par défaut du plugin

Définissez les valeurs par défaut à l'échelle du plugin dans `~/.openclaw/openclaw.json` :

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        config: {
          defaults: {
            fontFamily: "Fira Code",
            fontSize: 15,
            lineSpacing: 1.6,
            layout: "unified",
            showLineNumbers: true,
            diffIndicators: "bars",
            wordWrap: true,
            background: true,
            theme: "dark",
            fileFormat: "png",
            fileQuality: "standard",
            fileScale: 2,
            fileMaxWidth: 960,
            mode: "both",
          },
        },
      },
    },
  },
}
```

Valeurs par défaut prises en charge :

- `fontFamily`
- `fontSize`
- `lineSpacing`
- `layout`
- `showLineNumbers`
- `diffIndicators`
- `wordWrap`
- `background`
- `theme`
- `fileFormat`
- `fileQuality`
- `fileScale`
- `fileMaxWidth`
- `mode`

Les paramètres explicites de l'outil remplacent ces valeurs par défaut.

## Configuration de sécurité

- `security.allowRemoteViewer` (`boolean`, par défaut `false`)
  - `false` : les requêtes non en boucle locale vers les routes du visualiseur sont refusées.
  - `true` : les visionneuses distantes sont autorisées si le chemin tokenisé est valide.

Exemple :

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        config: {
          security: {
            allowRemoteViewer: false,
          },
        },
      },
    },
  },
}
```

## Cycle de vie et stockage des artefacts

- Les artefacts sont stockés dans le sous-dossier temp : `$TMPDIR/openclaw-diffs`.
- Les métadonnées de l'artefact de la visionneuse contiennent :
  - ID d'artefact aléatoire (20 caractères hexadécimaux)
  - jeton aléatoire (48 caractères hexadécimaux)
  - `createdAt` et `expiresAt`
  - chemin `viewer.html` stocké
- La durée de vie (TTL) par défaut de la visionneuse est de 30 minutes si elle n'est pas spécifiée.
- La durée de vie (TTL) maximale acceptée pour la visionneuse est de 6 heures.
- Le nettoyage s'exécute de manière opportuniste après la création de l'artefact.
- Les artefacts expirés sont supprimés.
- Le nettoyage de secours supprime les dossiers périmés de plus de 24 heures lorsque les métadonnées sont manquantes.

## URL de la visionneuse et comportement réseau

Route de la visionneuse :

- `/plugins/diffs/view/{artifactId}/{token}`

Ressources de la visionneuse :

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`

Comportement de construction de l'URL :

- Si `baseUrl` est fourni, il est utilisé après une validation stricte.
- Sans `baseUrl`, l'URL de la visionneuse par défaut est celle de bouclage `127.0.0.1`.
- Si le mode de liaison de la passerelle est `custom` et que `gateway.customBindHost` est défini, cet hôte est utilisé.

Règles `baseUrl` :

- Doit être `http://` ou `https://`.
- Les requêtes et les hachages sont rejetés.
- L'origine plus le chemin de base optionnel sont autorisés.

## Modèle de sécurité

Renforcement de la visionneuse :

- Bouclage uniquement par défaut.
- Chemins de la visionneuse tokenisés avec validation stricte de l'ID et du jeton.
- CSP de la réponse de la visionneuse :
  - `default-src 'none'`
  - scripts et ressources uniquement depuis self
  - aucun `connect-src` sortant
- Limitation des échecs distants lorsque l'accès distant est activé :
  - 40 échecs par 60 secondes
  - verrouillage de 60 secondes (`429 Too Many Requests`)

Renforcement du rendu des fichiers :

- Le routage des requêtes du navigateur de capture d'écran est refusé par défaut.
- Seules les ressources locales de la visionneuse provenant de `http://127.0.0.1/plugins/diffs/assets/*` sont autorisées.
- Les requêtes réseau externes sont bloquées.

## Exigences du navigateur pour le mode fichier

`mode: "file"` et `mode: "both"` nécessitent un navigateur compatible Chromium.

Ordre de résolution :

1. `browser.executablePath` dans la configuration OpenClaw.
2. Variables d'environnement :
   - `OPENCLAW_BROWSER_EXECUTABLE_PATH`
   - `BROWSER_EXECUTABLE_PATH`
   - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`
3. Secours pour la découverte de commande/chemin de la plateforme.

Texte d'échec courant :

- `Diff PNG/PDF rendering requires a Chromium-compatible browser...`

Résolvez en installant Chrome, Chromium, Edge ou Brave, ou en définissant l'une des options de chemin exécutable ci-dessus.

## Dépannage

Erreurs de validation de l'entrée :

- `Provide patch or both before and after text.`
  - Incluez à la fois `before` et `after`, ou fournissez `patch`.
- `Provide either patch or before/after input, not both.`
  - Ne mélangez pas les modes d'entrée.
- `Invalid baseUrl: ...`
  - Utilisez l'origine `http(s)` avec un chemin facultatif, sans requête/hachage.
- `{field} exceeds maximum size (...)`
  - Réduisez la taille de la charge utile.
- Rejet de correctif volumineux
  - Réduisez le nombre de fichiers de correctif ou le nombre total de lignes.

Problèmes d'accessibilité de la visionneuse :

- L'URL de la visionneuse résout vers `127.0.0.1` par défaut.
- Pour les scénarios d'accès à distance, soit :
  - passez `baseUrl` par appel d'outil, ou
  - utilisez `gateway.bind=custom` et `gateway.customBindHost`
- Activez `security.allowRemoteViewer` uniquement lorsque vous prévoyez un accès externe à la visionneuse.

La ligne de lignes non modifiées n'a pas de bouton d'extension :

- Cela peut arriver pour l'entrée de correctif lorsque le correctif ne porte pas de contexte extensible.
- Ceci est prévu et n'indique pas une défaillance de la visionneuse.

Artefact introuvable :

- L'artefact a expiré en raison du TTL.
- Le jeton ou le chemin a changé.
- Le nettoyage a supprimé les données obsolètes.

## Directives opérationnelles

- Préférez `mode: "view"` pour les révisions interactives locales dans le canvas.
- Préférez `mode: "file"` pour les canaux de chat sortants qui nécessitent une pièce jointe.
- Gardez `allowRemoteViewer` désactivé, sauf si votre déploiement nécessite des URL de visionneuse distantes.
- Définissez un `ttlSeconds` court et explicite pour les diffs sensibles.
- Évitez d'envoyer des secrets dans l'entrée diff lorsqu'ils ne sont pas requis.
- Si votre channel compresse agressivement les images (par exemple Telegram ou WhatsApp), préférez la sortie PDF (`fileFormat: "pdf"`).

Moteur de rendu diff :

- Propulsé par [Diffs](https://diffs.com).

## Documentation connexe

- [Vue d'ensemble des outils](/fr/tools)
- [Plugins](/fr/tools/plugin)
- [Navigateur](/fr/tools/browser)

import fr from '/components/footer/fr.mdx';

<fr />
