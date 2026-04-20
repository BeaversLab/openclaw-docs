---
title: "Diffs"
summary: "Visualiseur de diffs en lecture seule et rendu de fichiers pour les agents (tool de plugin optionnel)"
read_when:
  - You want agents to show code or markdown edits as diffs
  - You want a canvas-ready viewer URL or a rendered diff file
  - You need controlled, temporary diff artifacts with secure defaults
---

# Diffs

`diffs` est un tool de plugin optionnel avec des instructions système intégrées courtes et une compétence associée qui transforme le contenu des modifications en artefact de diff en lecture seule pour les agents.

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
2. Appelez `diffs` avec `mode: "view"` pour les flux axés d'abord sur le canevas.
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

Si vous souhaitez garder le tool `diffs` activé mais désactiver ses instructions système intégrées, définissez `plugins.entries.diffs.hooks.allowPromptInjection` sur `false` :

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

Cela bloque le hook `before_prompt_build` du plugin de diffs tout en gardant le plugin, le tool et la compétence associée disponibles.

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
- `lang` (`string`) : indication de substitution de langue pour le mode avant et après. Les valeurs inconnues reviennent au texte brut.
- `title` (`string`) : substitution du titre de la visionneuse.
- `mode` (`"view" | "file" | "both"`) : mode de sortie. Valeur par défaut : `defaults.mode` du plugin.
  Alias déprécié : `"image"` se comporte comme `"file"` et est toujours accepté pour la rétrocompatibilité.
- `theme` (`"light" | "dark"`) : thème de la visionneuse. Valeur par défaut : `defaults.theme` du plugin.
- `layout` (`"unified" | "split"`) : mise en page du diff. Valeur par défaut : `defaults.layout` du plugin.
- `expandUnchanged` (`boolean`) : développer les sections inchangées lorsque le contexte complet est disponible. Option par appel uniquement (pas une clé par défaut du plugin).
- `fileFormat` (`"png" | "pdf"`) : format de fichier rendu. Valeur par défaut : `defaults.fileFormat` du plugin.
- `fileQuality` (`"standard" | "hq" | "print"`) : préréglage de qualité pour le rendu PNG ou PDF.
- `fileScale` (`number`) : substitution de l'échelle de l'appareil (`1`-`4`).
- `fileMaxWidth` (`number`) : largeur de rendu maximale en pixels CSS (`640`-`2400`).
- `ttlSeconds` (`number`) : durée de vie (TTL) de l'artefact en secondes pour les sorties de la visionneuse et des fichiers autonomes. Par défaut 1800, max 21600.
- `baseUrl` (`string`) : substitution de l'origine de l'URL de la visionneuse. Remplace `viewerBaseUrl` du plugin. Doit être `http` ou `https`, sans requête/hachage.

Les alias d'entrée hérités sont toujours acceptés pour la rétrocompatibilité :

- `format` -> `fileFormat`
- `imageFormat` -> `fileFormat`
- `imageQuality` -> `fileQuality`
- `imageScale` -> `fileScale`
- `imageMaxWidth` -> `fileMaxWidth`

Validation et limites :

- `before` et `after` chacun max 512 Kio.
- `patch` max 2 Mio.
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

Champs partagés pour les modes qui créent une visionneuse :

- `artifactId`
- `viewerUrl`
- `viewerPath`
- `title`
- `expiresAt`
- `inputKind`
- `fileCount`
- `mode`
- `context` (`agentId`, `sessionId`, `messageChannel`, `agentAccountId` si disponibles)

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

Alias de compatibilité également renvoyés pour les appelants existants :

- `format` (même valeur que `fileFormat`)
- `imagePath` (même valeur que `filePath`)
- `imageBytes` (même valeur que `fileBytes`)
- `imageQuality` (même valeur que `fileQuality`)
- `imageScale` (même valeur que `fileScale`)
- `imageMaxWidth` (même valeur que `fileMaxWidth`)

Résumé du comportement du mode :

- `mode: "view"` : champs du visualiseur uniquement.
- `mode: "file"` : champs de fichier uniquement, aucun artefact de visualiseur.
- `mode: "both"` : champs du visualiseur plus champs de fichier. Si le rendu du fichier échoue, le visualiseur renvoie tout de même `fileError` et l'alias de compatibilité `imageError`.

## Sections inchangées réduites

- Le visualiseur peut afficher des lignes telles que `N unmodified lines`.
- Les contrôles d'extension sur ces lignes sont conditionnels et ne sont pas garantis pour chaque type d'entrée.
- Les contrôles d'extension apparaissent lorsque le diff rendu contient des données de contexte extensibles, ce qui est typique pour les entrées avant et après.
- Pour de nombreuses entrées de patch unifié, les corps de contexte omis ne sont pas disponibles dans les blocs de patch analysés, la ligne peut donc apparaître sans contrôles d'extension. Ce comportement est attendu.
- `expandUnchanged` s'applique uniquement lorsqu'un contexte extensible existe.

## Valeurs par défaut du plugin

Définir les valeurs par défaut pour l'ensemble du plugin dans `~/.openclaw/openclaw.json` :

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

Configuration persistante de l'URL du visualiseur :

- `viewerBaseUrl` (`string`, facultatif)
  - Alternative de repli appartenant au plugin pour les liens du visualiseur renvoyés lorsqu'un appel d'outil ne transmet pas `baseUrl`.
  - Doit être `http` ou `https`, sans query/hash.

Exemple :

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        config: {
          viewerBaseUrl: "https://gateway.example.com/openclaw",
        },
      },
    },
  },
}
```

## Configuration de sécurité

- `security.allowRemoteViewer` (`boolean`, par défaut `false`)
  - `false` : les requêtes non-bouclage vers les routes du visualiseur sont refusées.
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
- Le TTL par défaut de l'artefact est de 30 minutes s'il n'est pas spécifié.
- La durée de vie (TTL) maximale acceptée pour le visualiseur est de 6 heures.
- Le nettoyage s'exécute de manière opportuniste après la création de l'artefact.
- Les artefacts expirés sont supprimés.
- Le nettoyage de secours supprime les dossiers périmés de plus de 24 heures lorsque les métadonnées sont manquantes.

## URL du visualiseur et comportement réseau

Route du visualiseur :

- `/plugins/diffs/view/{artifactId}/{token}`

Actifs du visualiseur :

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`

Le document du visualiseur résout ces actifs par rapport à l'URL du visualiseur, un préfixe de chemin `baseUrl` facultatif est donc préservé pour les requêtes d'actifs également.

Comportement de construction de l'URL :

- Si le `baseUrl` de l'appel tool est fourni, il est utilisé après validation stricte.
- Sinon, si le `viewerBaseUrl` du plugin est configuré, il est utilisé.
- Sans aucune de ces substitutions, l'URL du visualiseur par défaut est `127.0.0.1` de bouclage.
- Si le mode de liaison de la passerelle est `custom` et que `gateway.customBindHost` est défini, cet hôte est utilisé.

Règles `baseUrl` :

- Doit être `http://` ou `https://`.
- La query et le hash sont rejetés.
- L'origine plus un chemin de base facultatif est autorisé.

## Modèle de sécurité

Renforcement du visualiseur :

- Uniquement en bouclage par défaut.
- Chemins du visualiseur tokenisés avec validation stricte de l'ID et du jeton.
- CSP de réponse du visualiseur :
  - `default-src 'none'`
  - scripts et actifs uniquement depuis self
  - pas de `connect-src` sortant
- Limitation du nombre d'échecs à distance lorsque l'accès à distance est activé :
  - 40 échecs par 60 secondes
  - Verrouillage de 60 secondes (`429 Too Many Requests`)

Durcissement du rendu des fichiers :

- Le routage des demandes du navigateur de capture d'écran est refusé par défaut.
- Seules les ressources de visionneuse locale provenant de `http://127.0.0.1/plugins/diffs/assets/*` sont autorisées.
- Les demandes réseau externes sont bloquées.

## Exigences du navigateur pour le mode fichier

`mode: "file"` et `mode: "both"` nécessitent un navigateur compatible Chromium.

Ordre de résolution :

1. `browser.executablePath` dans la configuration OpenClaw.
2. Variables d'environnement :
   - `OPENCLAW_BROWSER_EXECUTABLE_PATH`
   - `BROWSER_EXECUTABLE_PATH`
   - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`
3. Repli sur la découverte de commande/chemin de la plateforme.

Texte d'échec courant :

- `Diff PNG/PDF rendering requires a Chromium-compatible browser...`

Résolvez le problème en installant Chrome, Chromium, Edge ou Brave, ou en définissant l'une des options de chemin exécutable ci-dessus.

## Dépannage

Erreurs de validation des entrées :

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
  - définissez le `viewerBaseUrl` du plugin, ou
  - passez `baseUrl` par appel de tool, ou
  - utilisez `gateway.bind=custom` et `gateway.customBindHost`
- Si `gateway.trustedProxies` inclut la boucle locale pour un proxy sur le même hôte (par exemple Tailscale Serve), les demandes de visionneuse en boucle locale brutes sans en-têtes IP client transférés échouent intentionnellement en mode fermé.
- Pour cette topologie de proxy :
  - privilégiez `mode: "file"` ou `mode: "both"` lorsque vous avez uniquement besoin d'une pièce jointe, ou
  - activez intentionnellement `security.allowRemoteViewer` et définissez le `viewerBaseUrl` du plugin ou transmettez un `baseUrl` proxy/public lorsque vous avez besoin d'une URL de visionneuse partageable
- Activez `security.allowRemoteViewer` uniquement lorsque vous prévoyez un accès externe à la visionneuse.

La ligne des lignes non modifiées n'a pas de bouton d'extension :

- Cela peut se produire pour l'entrée de correctif lorsque le correctif ne contient pas de contexte extensible.
- Ceci est attendu et n'indique pas une défaillance de la visionneuse.

Artefact introuvable :

- L'artefact a expiré en raison du TTL.
- Le jeton ou le chemin a changé.
- Le nettoyage a supprimé les données obsolètes.

## Directives opérationnelles

- Privilégiez `mode: "view"` pour les examens interactifs locaux dans le canevas.
- Privilégiez `mode: "file"` pour les canaux de chat sortants qui nécessitent une pièce jointe.
- Gardez `allowRemoteViewer` désactivé, sauf si votre déploiement nécessite des URL de visionneuse à distance.
- Définissez un `ttlSeconds` court explicite pour les différences sensibles.
- Évitez d'envoyer des secrets dans l'entrée de différence lorsqu'ils ne sont pas requis.
- Si votre channel compresse agressivement les images (par exemple Telegram ou WhatsApp), privilégiez la sortie PDF (`fileFormat: "pdf"`).

Moteur de rendu de différences :

- Propulsé par [Diffs](https://diffs.com).

## Documentation connexe

- [Aperçu des outils](/fr/tools)
- [Plugins](/fr/tools/plugin)
- [Navigateur](/fr/tools/browser)
