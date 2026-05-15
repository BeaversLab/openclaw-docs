---
summary: "Visualiseur de diffs en lecture seule et générateur de fichiers pour les agents (tool de plugin optionnel)"
title: "Diffs"
sidebarTitle: "Diffs"
read_when:
  - You want agents to show code or markdown edits as diffs
  - You want a canvas-ready viewer URL or a rendered diff file
  - You need controlled, temporary diff artifacts with secure defaults
---

`diffs` est un tool de plugin optionnel avec une guidance système intégrée courte et une compétence associée qui transforme le contenu des modifications en un artefact de diff en lecture seule pour les agents.

Il accepte :

- texte `before` et `after`
- unifié `patch`

Il peut retourner :

- une URL de visionneuse de passerelle pour la présentation sur canevas
- un chemin de fichier rendu (PNG ou PDF) pour la livraison de messages
- les deux sorties en un seul appel

Lorsqu'il est activé, le plugin prépend des directives d'utilisation concises dans l'espace du système de prompt (system-prompt) et expose également une compétence détaillée pour les cas où l'agent a besoin d'instructions plus complètes.

## Quick start

<Steps>
  <Step title="Installer le plugin">
    ```bash
    openclaw plugins install diffs
    ```
  </Step>
  <Step title="Activer le plugin">
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
  </Step>
  <Step title="Choisir un mode">
    <Tabs>
      <Tab title="view">
        Flux privilégiant Canvas : les agents appellent `diffs` avec `mode: "view"` et ouvrent `details.viewerUrl` avec `canvas present`.
      </Tab>
      <Tab title="file">
        Livraison de fichier de chat : les agents appellent `diffs` avec `mode: "file"` et envoient `details.filePath` avec `message` en utilisant `path` ou `filePath`.
      </Tab>
      <Tab title="both">
        Combiné : les agents appellent `diffs` avec `mode: "both"` pour obtenir les deux artefacts en un seul appel.
      </Tab>
    </Tabs>
  </Step>
</Steps>

## Désactiver les instructions système intégrées

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

Si vous souhaitez désactiver à la fois les instructions et le tool, désactivez plutôt le plugin.

## Workflow typeique de l'agent

<Steps>
  <Step title="Appeler diffs">L'agent appelle le tool `diffs` avec des entrées.</Step>
  <Step title="Lire les détails">L'agent lit les champs `details` de la réponse.</Step>
  <Step title="Présenter">L'agent ouvre `details.viewerUrl` avec `canvas present`, envoie `details.filePath` avec `message` en utilisant `path` ou `filePath`, ou fait les deux.</Step>
</Steps>

## Exemples d'entrée

<Tabs>
  <Tab title="Avant et après">
    ```json
    {
      "before": "# Hello\n\nOne",
      "after": "# Hello\n\nTwo",
      "path": "docs/example.md",
      "mode": "view"
    }
    ```
  </Tab>
  <Tab title="Correctif">
    ```json
    {
      "patch": "diff --git a/src/example.ts b/src/example.ts\n--- a/src/example.ts\n+++ b/src/example.ts\n@@ -1 +1 @@\n-const x = 1;\n+const x = 2;\n",
      "mode": "both"
    }
    ```
  </Tab>
</Tabs>

## Référence de l'outil d'entrée

Tous les champs sont facultatifs sauf indication contraire.

<ParamField path="before" type="string">
  Texte original. Requis avec `after` lorsque `patch` est omis.
</ParamField>
<ParamField path="after" type="string">
  Texte mis à jour. Requis avec `before` lorsque `patch` est omis.
</ParamField>
<ParamField path="patch" type="string">
  Texte de diff unifié. Mutuellement exclusif avec `before` et `after`.
</ParamField>
<ParamField path="path" type="string">
  Nom de fichier d'affichage pour le mode avant et après.
</ParamField>
<ParamField path="lang" type="string">
  Indicateur de substitution de langue pour le mode avant et après. Les valeurs inconnues reviennent au texte brut.
</ParamField>
<ParamField path="title" type="string">
  Substitution du titre de la visionneuse.
</ParamField>
<ParamField path="mode" type='"view" | "file" | "both"'>
  Mode de sortie. Par défaut, défaut du plugin `defaults.mode`. Alias obsolète : `"image"` se comporte comme `"file"` et est toujours accepté pour la rétrocompatibilité.
</ParamField>
<ParamField path="theme" type='"light" | "dark"'>
  Thème de la visionneuse. Par défaut, défaut du plugin `defaults.theme`.
</ParamField>
<ParamField path="layout" type='"unified" | "split"'>
  Mise en page du diff. Par défaut, défaut du plugin `defaults.layout`.
</ParamField>
<ParamField path="expandUnchanged" type="boolean">
  Développer les sections inchangées lorsque le contexte complet est disponible. Option par appel uniquement (pas une clé par défaut du plugin).
</ParamField>
<ParamField path="fileFormat" type='"png" | "pdf"'>
  Format de fichier rendu. Par défaut, défaut du plugin `defaults.fileFormat`.
</ParamField>
<ParamField path="fileQuality" type='"standard" | "hq" | "print"'>
  Préréglage de qualité pour le rendu PNG ou PDF.
</ParamField>
<ParamField path="fileScale" type="number">
  Substitution de l'échelle de l'appareil (`1`-`4`).
</ParamField>
<ParamField path="fileMaxWidth" type="number">
  Largeur de rendu maximale en pixels CSS (`640`-`2400`).
</ParamField>
<ParamField path="ttlSeconds" type="number"%%PH:JSX_ATTR:66:e15fae6%% default="1800">
  TTL de l'artefact en secondes pour la visionneuse et les sorties de fichiers autonomes. Max 21600.
</ParamField>
<ParamField path="baseUrl" type="string">
  Substitution de l'origine de l'URL de la visionneuse. Remplace le plugin `viewerBaseUrl`. Doit être `http` ou `https`, sans requête/hachage.
</ParamField>

<AccordionGroup>
  <Accordion title="Anciens alias d'entrée">
    Toujours acceptés pour la rétrocompatibilité :

    - `format` -> `fileFormat`
    - `imageFormat` -> `fileFormat`
    - `imageQuality` -> `fileQuality`
    - `imageScale` -> `fileScale`
    - `imageMaxWidth` -> `fileMaxWidth`

  </Accordion>
  <Accordion title="Validation et limites">
    - `before` et `after` chacun max 512 KiB.
    - `patch` max 2 MiB.
    - `path` max 2048 octets.
    - `lang` max 128 octets.
    - `title` max 1024 octets.
    - Plafond de complexité du correctif : max 128 fichiers et 120 000 lignes au total.
    - `patch` et `before` ou `after` ensemble sont rejetés.
    - Limites de sécurité des fichiers rendus (s'appliquent à PNG et PDF) :
      - `fileQuality: "standard"` : max 8 MP (8 000 000 pixels rendus).
      - `fileQuality: "hq"` : max 14 MP (14 000 000 pixels rendus).
      - `fileQuality: "print"` : max 24 MP (24 000 000 pixels rendus).
      - Le PDF a également un maximum de 50 pages.

  </Accordion>
</AccordionGroup>

## Contrat de détails de sortie

L'outil renvoie des métadonnées structurées sous `details`.

<AccordionGroup>
  <Accordion title="Champs de la visionneuse">
    Champs partagés pour les modes qui créent une visionneuse :

    - `artifactId`
    - `viewerUrl`
    - `viewerPath`
    - `title`
    - `expiresAt`
    - `inputKind`
    - `fileCount`
    - `mode`
    - `context` (`agentId`, `sessionId`, `messageChannel`, `agentAccountId` si disponible)

  </Accordion>
  <Accordion title="Champs de fichier">
    Champs de fichier lorsqu'un PNG ou PDF est rendu :

    - `artifactId`
    - `expiresAt`
    - `filePath`
    - `path` (même valeur que `filePath`, pour compatibilité avec l'outil de message)
    - `fileBytes`
    - `fileFormat`
    - `fileQuality`
    - `fileScale`
    - `fileMaxWidth`

  </Accordion>
  <Accordion title="Alias de compatibilité">
    Également renvoyé pour les appelants existants :

    - `format` (même valeur que `fileFormat`)
    - `imagePath` (même valeur que `filePath`)
    - `imageBytes` (même valeur que `fileBytes`)
    - `imageQuality` (même valeur que `fileQuality`)
    - `imageScale` (même valeur que `fileScale`)
    - `imageMaxWidth` (même valeur que `fileMaxWidth`)

  </Accordion>
</AccordionGroup>

Résumé du comportement du mode :

| Mode     | Ce qui est renvoyé                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `"view"` | Champs de la visionneuse uniquement.                                                                                                                         |
| `"file"` | Champs de fichier uniquement, aucun artefact de visionneuse.                                                                                                 |
| `"both"` | Champs du visualiseur plus champs de fichier. Si le rendu du fichier échoue, le visualiseur renvoie tout de même avec les alias `fileError` et `imageError`. |

## Sections inchangées réduites

- Le visualiseur peut afficher des lignes telles que `N unmodified lines`.
- Les commandes d'extension sur ces lignes sont conditionnelles et ne sont pas garanties pour chaque type d'entrée.
- Les commandes d'extension apparaissent lorsque le diff rendu contient des données de contexte extensibles, ce qui est typique pour les entrées avant et après.
- Pour de nombreuses entrées de correctif unifié, les corps de contexte omis ne sont pas disponibles dans les blocs de correctif analysés, la ligne peut donc apparaître sans commandes d'extension. Ce comportement est normal.
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
            ttlSeconds: 21600,
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
- `ttlSeconds`

Les paramètres explicites de l'outil remplacent ces valeurs par défaut.

### Configuration de l'URL persistante du visualiseur

<ParamField path="viewerBaseUrl" type="string">
  Fallback propriétaire du plugin pour les liens de visualisation renvoyés lorsqu'un appel d'outil ne transmet pas `baseUrl`. Doit être `http` ou `https`, sans requête/hachage.
</ParamField>

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

<ParamField path="security.allowRemoteViewer" type="boolean" default="false">
  `false` : les requêtes non boucle locale vers les routes du visualiseur sont refusées. `true` : les visualiseurs distants sont autorisés si le chemin tokenisé est valide.
</ParamField>

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

- Les artefacts sont stockés dans le sous-dossier temporaire : `$TMPDIR/openclaw-diffs`.
- Les métadonnées de l'artefact du visualiseur contiennent :
  - ID d'artefact aléatoire (20 caractères hexadécimaux)
  - jeton aléatoire (48 caractères hexadécimaux)
  - `createdAt` et `expiresAt`
  - chemin `viewer.html` stocké
- Le TTL par défaut de l'artefact est de 30 minutes lorsqu'il n'est pas spécifié.
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

Le document du visualiseur résout ces actifs par rapport à l'URL du visualiseur, donc un préfixe de chemin `baseUrl` optionnel est préservé pour les demandes d'actifs également.

Comportement de construction de l'URL :

- Si le `baseUrl` de l'appel d'outil est fourni, il est utilisé après validation stricte.
- Sinon, si le `viewerBaseUrl` du plugin est configuré, il est utilisé.
- Sans aucune de ces substitutions, l'URL du visualiseur par défaut est `127.0.0.1` en boucle locale.
- Si le mode de liaison de la passerelle est `custom` et que `gateway.customBindHost` est défini, cet hôte est utilisé.

Règles `baseUrl` :

- Doit être `http://` ou `https://`.
- La requête et le hachage sont rejetés.
- L'origine plus le chemin de base optionnel sont autorisés.

## Modèle de sécurité

<AccordionGroup>
  <Accordion title="Durcissement du visualiseur">
    - Bouclage local (loopback) uniquement par défaut.
    - Chemins du visualiseur tokenisés avec validation stricte de l'ID et du jeton.
    - CSP de réponse du visualiseur :
      - `default-src 'none'`
      - scripts et ressources provenant uniquement de self
      - aucune connexion sortante `connect-src`
    - Limitation des échecs à distance lorsque l'accès à distance est activé :
      - 40 échecs par 60 secondes
      - verrouillage de 60 secondes (`429 Too Many Requests`)

  </Accordion>
  <Accordion title="Durcissement du rendu de fichiers">
    - Le routage des demandes du navigateur de capture d'écran est interdit par défaut.
    - Seules les ressources locales du visualiseur provenant de `http://127.0.0.1/plugins/diffs/assets/*` sont autorisées.
    - Les requêtes réseau externes sont bloquées.

  </Accordion>
</AccordionGroup>

## Configuration requise du navigateur pour le mode fichier

`mode: "file"` et `mode: "both"` nécessitent un navigateur compatible Chromium.

Ordre de résolution :

<Steps>
  <Step title="Config">
    `browser.executablePath` dans la configuration OpenClaw.
  </Step>
  <Step title="Variables d'environnement">
    - `OPENCLAW_BROWSER_EXECUTABLE_PATH`
    - `BROWSER_EXECUTABLE_PATH`
    - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`

  </Step>
  <Step title="Repli de la plateforme">
    Repli pour la découverte de commande/chemin de la plateforme.
  </Step>
</Steps>

Texte d'échec courant :

- `Diff PNG/PDF rendering requires a Chromium-compatible browser...`

Résolvez le problème en installant Chrome, Chromium, Edge ou Brave, ou en définissant l'une des options de chemin exécutable ci-dessus.

## Dépannage

<AccordionGroup>
  <Accordion title="Erreurs de validation d'entrée">
    - `Provide patch or both before and after text.` — incluez à la fois `before` et `after`, ou fournissez `patch`.
    - `Provide either patch or before/after input, not both.` — ne mélangez pas les modes d'entrée.
    - `Invalid baseUrl: ...` — utilisez l'origine `http(s)` avec un chemin optionnel, sans requête/hash.
    - `{field} exceeds maximum size (...)` — réduisez la taille de la charge utile.
    - Rejet de correctif volumineux — réduisez le nombre de fichiers de correctif ou le nombre total de lignes.

  </Accordion>
  <Accordion title="Accessibilité de la visionneuse">
    - L'URL de la visionneuse résout vers `127.0.0.1` par défaut.
    - Pour les scénarios d'accès à distance, vous pouvez soit :
      - définir le `viewerBaseUrl` du plugin, ou
      - passer `baseUrl` par appel d'outil, ou
      - utiliser `gateway.bind=custom` et `gateway.customBindHost`
    - Si `gateway.trustedProxies`Tailscale inclut une boucle locale pour un proxy sur le même hôte (par exemple Tailscale Serve), les requêtes brutes de visionneuse en boucle locale sans en-têtes d'IP client transférés échouent en mode fermé par conception.
    - Pour cette topologie de proxy :
      - préférez `mode: "file"` ou `mode: "both"` lorsque vous avez seulement besoin d'une pièce jointe, ou
      - activez intentionnellement `security.allowRemoteViewer` et définissez le `viewerBaseUrl` du plugin ou passez un `baseUrl` proxy/public lorsque vous avez besoin d'une URL de visionneuse partageable
    - N'activez `security.allowRemoteViewer` que lorsque vous envisagez un accès externe à la visionneuse.

  </Accordion>
  <Accordion title="La ligne des lignes non modifiées n'a pas de bouton d'extension">
    Cela peut arriver pour l'entrée de correctif lorsque le correctif ne contient pas de contexte extensible. C'est normal et n'indique pas un échec de la visionneuse.
  </Accordion>
  <Accordion title="Artefact introuvable">
    - L'artefact a expiré en raison du TTL.
    - Le jeton ou le chemin a changé.
    - Le nettoyage a supprimé les données obsolètes.

  </Accordion>
</AccordionGroup>

## Conseils opérationnels

- Privilégiez `mode: "view"` pour les révisions interactives locales dans le canvas.
- Privilégiez `mode: "file"` pour les canaux de conversation sortants qui nécessitent une pièce jointe.
- Gardez `allowRemoteViewer` désactivé, sauf si votre déploiement nécessite des URL de visionneuse à distance.
- Définissez un `ttlSeconds` court et explicite pour les diffs sensibles.
- Évitez d'envoyer des secrets dans l'entrée de diff lorsque ce n'est pas nécessaire.
- Si votre canal compresse agressivement les images (par exemple Telegram ou WhatsApp), préférez la sortie PDF (TelegramWhatsApp`fileFormat: "pdf"`).

<Note>Moteur de rendu de diff propulsé par [Diffs](https://diffs.com).</Note>

## Connexes

- [Navigateur](/fr/tools/browser)
- [Plugins](/fr/tools/plugin)
- [Vue d'ensemble des outils](/fr/tools)
