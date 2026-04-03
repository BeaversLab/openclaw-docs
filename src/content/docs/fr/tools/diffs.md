---
title: "Diffs"
summary: "Visualiseur de diffs en lecture seule et générateur de fichiers pour les agents (tool de plugin optionnel)"
read_when:
  - You want agents to show code or markdown edits as diffs
  - You want a canvas-ready viewer URL or a rendered diff file
  - You need controlled, temporary diff artifacts with secure defaults
---

# Diffs

`diffs` est un tool de plugin facultatif avec un système de guidance intégré court et une compétence associée qui transforme le contenu des modifications en un artefact de diff en lecture seule pour les agents.

Il accepte :

- texte `before` et `after`
- un `patch` unifié

Il peut retourner :

- une URL de visionneuse de passerelle pour la présentation sur canevas
- un chemin de fichier rendu (PNG ou PDF) pour la livraison de messages
- les deux sorties en un seul appel

Lorsqu'il est activé, le plugin prépend des directives d'utilisation concises dans l'espace du système de prompt (system-prompt) et expose également une compétence détaillée pour les cas où l'agent a besoin d'instructions plus complètes.

## Quick start

1. Activez le plugin.
2. Appelez `diffs` avec `mode: "view"` pour les flux privilégiant le canevas.
3. Appelez `diffs` avec `mode: "file"` pour les flux de livraison de fichiers de chat.
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

## Désactiver la guidance système intégrée

Si vous souhaitez garder le tool `diffs` activé mais désactiver sa guidance système intégrée (system-prompt), définissez `plugins.entries.diffs.hooks.allowPromptInjection` sur `false` :

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

Si vous souhaitez désactiver à la fois la guidance et le tool, désactivez plutôt le plugin.

## Flux de travail typique de l'agent

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

Patch :

```json
{
  "patch": "diff --git a/src/example.ts b/src/example.ts\n--- a/src/example.ts\n+++ b/src/example.ts\n@@ -1 +1 @@\n-const x = 1;\n+const x = 2;\n",
  "mode": "both"
}
```

## Référence de l'entrée du tool

Tous les champs sont facultatifs sauf indication contraire :

- `before` (`string`) : texte original. Requis avec `after` lorsque `patch` est omis.
- `after` (`string`) : texte mis à jour. Requis avec `before` lorsque `patch` est omis.
- `patch` (`string`) : texte de diff unifié. Mutuellement exclusif avec `before` et `after`.
- `path` (`string`) : nom de fichier à afficher pour le mode avant et après.
- `lang` (`string`) : indicateur de substitution de langue pour le mode avant et après. Les valeurs inconnues reviennent au texte brut.
- `title` (`string`) : substitution du titre de la visionneuse.
- `mode` (`"view" | "file" | "both"`) : mode de sortie. La valeur par défaut est `defaults.mode` du plugin.
  Alias déconseillé : `"image"` se comporte comme `"file"` et est toujours accepté pour la rétrocompatibilité.
- `theme` (`"light" | "dark"`) : thème de la visionneuse. La valeur par défaut est `defaults.theme` du plugin.
- `layout` (`"unified" | "split"`) : disposition du diff. La valeur par défaut est `defaults.layout` du plugin.
- `expandUnchanged` (`boolean`) : développer les sections inchangées lorsque le contexte complet est disponible. Option par appel uniquement (pas une clé de défaut de plugin).
- `fileFormat` (`"png" | "pdf"`) : format de fichier rendu. La valeur par défaut est `defaults.fileFormat` du plugin.
- `fileQuality` (`"standard" | "hq" | "print"`) : préréglage de qualité pour le rendu PNG ou PDF.
- `fileScale` (`number`) : substitution de l'échelle de l'appareil (`1`-`4`).
- `fileMaxWidth` (`number`) : largeur de rendu maximale en pixels CSS (`640`-`2400`).
- `ttlSeconds` (`number`) : durée de vie de l'artefact de la visionneuse en secondes. Par défaut 1800, max 21600.
- `baseUrl` (`string`) : remplacement de l'origine de l'URL du visualiseur. Doit être `http` ou `https`, sans requête/hachage.

Validation et limites :

- `before` et `after` chacun max 512 KiB.
- `patch` max 2 MiB.
- `path` max 2048 octets.
- `lang` max 128 octets.
- `title` max 1024 octets.
- Plafond de complexité du correctif : max 128 fichiers et 120 000 lignes au total.
- `patch` et `before` ou `after` ensemble sont rejetés.
- Limites de sécurité des fichiers rendus (s'appliquent au PNG et au PDF) :
  - `fileQuality: "standard"` : max 8 MP (8 000 000 pixels rendus).
  - `fileQuality: "hq"` : max 14 MP (14 000 000 pixels rendus).
  - `fileQuality: "print"` : max 24 MP (24 000 000 pixels rendus).
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
- `context` (`agentId`, `sessionId`, `messageChannel`, `agentAccountId` lorsque disponible)

Champs de fichier lors du rendu PNG ou PDF :

- `artifactId`
- `expiresAt`
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
- `mode: "both"` : champs du visualiseur plus champs du fichier. Si le rendu du fichier échoue, le visualiseur renvoie quand même avec `fileError`.

## Sections inchangées réduites

- Le visualiseur peut afficher des lignes comme `N unmodified lines`.
- Les contrôles de développement sur ces lignes sont conditionnels et ne sont pas garantis pour chaque type d'entrée.
- Les contrôles de développement apparaissent lorsque le diff rendu contient des données de contexte extensibles, ce qui est typique pour les entrées avant et après.
- Pour de nombreuses entrées de patch unifié, les corps de contexte omis ne sont pas disponibles dans les blocs de patch analysés, la ligne peut donc apparaître sans contrôles de développement. Ceci est un comportement attendu.
- `expandUnchanged` s'applique uniquement lorsqu'un contexte extensible existe.

## Valeurs par défaut du plugin

Définissez les valeurs par défaut de l'ensemble du plugin dans `~/.openclaw/openclaw.json` :

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
  - `false` : les requêtes non bouclées vers les routes du visualiseur sont refusées.
  - `true` : les visualiseurs distants sont autorisés si le chemin tokenisé est valide.

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
- Les métadonnées de l'artefact du visualiseur contiennent :
  - ID d'artefact aléatoire (20 caractères hexadécimaux)
  - jeton aléatoire (48 caractères hexadécimaux)
  - `createdAt` et `expiresAt`
  - chemin `viewer.html` stocké
- Le TTL du visualiseur par défaut est de 30 minutes s'il n'est pas spécifié.
- Le TTL maximum accepté pour le visualiseur est de 6 heures.
- Le nettoyage s'exécute de manière opportuniste après la création de l'artefact.
- Les artefacts expirés sont supprimés.
- Le nettoyage de secours supprime les dossiers obsolètes de plus de 24 heures lorsque les métadonnées sont manquantes.

## URL de la visionneuse et comportement réseau

Route de la visionneuse :

- `/plugins/diffs/view/{artifactId}/{token}`

Ressources de la visionneuse :

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`

Le document de visualisateur résout ces actifs par rapport à l'URL du visualisateur, donc un préfixe de chemin `baseUrl` optionnel est également préservé pour les deux demandes d'actifs.

Comportement de construction de l'URL :

- Si `baseUrl` est fourni, il est utilisé après une validation stricte.
- Sans `baseUrl`, l'URL du visualisateur par défaut est `127.0.0.1` en boucle locale.
- Si le mode de liaison de la passerelle est `custom` et que `gateway.customBindHost` est défini, cet hôte est utilisé.

Règles `baseUrl` :

- Doit être `http://` ou `https://`.
- Les requêtes et les hachages sont rejetés.
- L'origine plus le chemin de base optionnel sont autorisés.

## Modèle de sécurité

Renforcement du visualisateur :

- Boucle locale uniquement par défaut.
- Chemins de visualisateur tokenisés avec une validation stricte de l'ID et du jeton.
- CSP de réponse du visualisateur :
  - `default-src 'none'`
  - scripts et actifs uniquement depuis self
  - aucun `connect-src` sortant
- Limitation des échecs à distance lorsque l'accès à distance est activé :
  - 40 échecs par 60 secondes
  - Verrouillage de 60 secondes (`429 Too Many Requests`)

Renforcement du rendu des fichiers :

- Le routage des demandes du navigateur de capture d'écran est refusé par défaut.
- Seuls les actifs de visualisateur locaux provenant de `http://127.0.0.1/plugins/diffs/assets/*` sont autorisés.
- Les demandes réseau externes sont bloquées.

## Exigences du navigateur pour le mode fichier

`mode: "file"` et `mode: "both"` ont besoin d'un navigateur compatible Chromium.

Ordre de résolution :

1. `browser.executablePath` dans la configuration OpenClaw.
2. Variables d'environnement :
   - `OPENCLAW_BROWSER_EXECUTABLE_PATH`
   - `BROWSER_EXECUTABLE_PATH`
   - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`
3. Repli de la découverte de commande/chemin de la plateforme.

Texte d'échec courant :

- `Diff PNG/PDF rendering requires a Chromium-compatible browser...`

Correction en installant Chrome, Chromium, Edge ou Brave, ou en définissant l'une des options de chemin exécutable ci-dessus.

## Dépannage

Erreurs de validation de l'entrée :

- `Provide patch or both before and after text.`
  - Incluez à la fois `before` et `after`, ou fournissez `patch`.
- `Provide either patch or before/after input, not both.`
  - Ne mélangez pas les modes de saisie.
- `Invalid baseUrl: ...`
  - Utilisez l'origine `http(s)` avec un chemin facultatif, sans requête/hachage.
- `{field} exceeds maximum size (...)`
  - Réduisez la taille de la charge utile.
- Rejet de correctif volumineux
  - Réduisez le nombre de fichiers de correctif ou le nombre total de lignes.

Problèmes d'accessibilité de la visionneuse :

- L'URL de la visionneuse résout par défaut `127.0.0.1`.
- Pour les scénarios d'accès à distance, soit :
  - passez `baseUrl` par appel d'outil, ou
  - utilisez `gateway.bind=custom` et `gateway.customBindHost`
- Activez `security.allowRemoteViewer` uniquement lorsque vous avez l'intention d'autoriser l'accès externe à la visionneuse.

La ligne des lignes non modifiées n'a pas de bouton d'extension :

- Cela peut se produire pour l'entrée de correctif lorsque le correctif ne contient pas de contexte extensible.
- Ceci est attendu et n'indique pas une défaillance de la visionneuse.

Artefact introuvable :

- L'artefact a expiré en raison du TTL.
- Le jeton ou le chemin a changé.
- Le nettoyage a supprimé les données périmées.

## Directives opérationnelles

- Privilégiez `mode: "view"` pour les révisions interactives locales dans le canevas.
- Privilégiez `mode: "file"` pour les canaux de chat sortants qui nécessitent une pièce jointe.
- Gardez `allowRemoteViewer` désactivé, sauf si votre déploiement nécessite des URL de visionneuse à distance.
- Définissez un `ttlSeconds` court explicite pour les diffs sensibles.
- Évitez d'envoyer des secrets dans l'entrée de diff lorsque cela n'est pas nécessaire.
- Si votre channel compresse agressivement les images (par exemple Telegram ou WhatsApp), privilégiez la sortie PDF (`fileFormat: "pdf"`).

Moteur de rendu de diff :

- Propulsé par [Diffs](https://diffs.com).

## Documentation connexe

- [Aperçu des outils](/en/tools)
- [Plugins](/en/tools/plugin)
- [Navigateur](/en/tools/browser)
