---
summary: "Visualiseur de diffs en lecture seule et générateur de fichiers pour les agents (tool de plugin optionnel)"
title: "Diffs"
sidebarTitle: "Diffs"
read_when:
  - You want agents to show code or markdown edits as diffs
  - You want a canvas-ready viewer URL or a rendered diff file
  - You need controlled, temporary diff artifacts with secure defaults
---

`diffs` est un tool de plugin optionnel avec des instructions système intégrées courtes et une compétence associée qui transforme le contenu des modifications en un artefact de diff en lecture seule pour les agents.

Il accepte :

- texte `before` et `after`
- un `patch` unifié

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

Cela bloque le hook `before_prompt_build` du plugin de diffs tout en gardant le plugin, le tool et la compétence associée disponibles.

Si vous souhaitez désactiver à la fois les instructions et le tool, désactivez plutôt le plugin.

## Workflow typeique de l'agent

<Steps>
  <Step title="Appeler diffs">L'agent appelle le tool `diffs` avec des données d'entrée.</Step>
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
  <Tab title="Patch">
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
  Indication de substitution de langue pour le mode avant et après. Les valeurs inconnues et les langues en dehors de l'ensemble de visualiseurs par défaut reviennent au texte brut, sauf si le plugin Diff Viewer Language Pack est installé.
</ParamField>

<ParamField path="title" type="string">
  Remplacement du titre de la visionneuse.
</ParamField>
<ParamField path="mode" type='"view" | "file" | "both"'>
  Mode de sortie. Par défaut, celui du plugin `defaults.mode`. Alias déprécié : `"image"` se comporte comme `"file"` et est toujours accepté pour la compatibilité descendante.
</ParamField>
<ParamField path="theme" type='"light" | "dark"'>
  Thème de la visionneuse. Par défaut, celui du plugin `defaults.theme`.
</ParamField>
<ParamField path="layout" type='"unified" | "split"'>
  Mise en page des différences. Par défaut, celle du plugin `defaults.layout`.
</ParamField>
<ParamField path="expandUnchanged" type="boolean">
  Développer les sections inchangées lorsque le contexte complet est disponible. Option par appel uniquement (pas une clé par défaut du plugin).
</ParamField>
<ParamField path="fileFormat" type='"png" | "pdf"'>
  Format de fichier rendu. Par défaut, celui du plugin `defaults.fileFormat`.
</ParamField>
<ParamField path="fileQuality" type='"standard" | "hq" | "print"'>
  Préréglage de qualité pour le rendu PNG ou PDF.
</ParamField>
<ParamField path="fileScale" type="number">
  Remplacement de l'échelle de l'appareil (`1`-`4`).
</ParamField>
<ParamField path="fileMaxWidth" type="number">
  Largeur de rendu maximale en pixels CSS (`640`-`2400`).
</ParamField>
<ParamField path="ttlSeconds" type="number" default="1800">
  Durée de vie (TTL) de l'artefact en secondes pour les sorties de la visionneuse et des fichiers autonomes. Maximum 21600.
</ParamField>
<ParamField path="baseUrl" type="string">
  Remplacement de l'origine de l'URL de la visionneuse. Remplace le `viewerBaseUrl` du plugin. Doit être `http` ou `https`, sans requête/hachage.
</ParamField>

<AccordionGroup>
  <Accordion title="Alias d'entrée hérités">
    Toujours acceptés pour la compatibilité descendante :

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
    - Limites de sécurité des fichiers rendus (s'appliquent au PNG et PDF) :
      - `fileQuality: "standard"` : max 8 MP (8 000 000 pixels rendus).
      - `fileQuality: "hq"` : max 14 MP (14 000 000 pixels rendus).
      - `fileQuality: "print"` : max 24 MP (24 000 000 pixels rendus).
      - PDF a également un maximum de 50 pages.

  </Accordion>
</AccordionGroup>

## Coloration syntaxique

OpenClaw inclut la coloration syntaxique pour les langages de source, de configuration et de documentation courants :

`javascript`, `typescript`, `tsx`, `jsx`, `json`, `markdown`, `yaml`, `css`, `html`, `sh`, `python`, `go`, `rust`, `java`, `c`, `cpp`, `csharp`, `php`, `sql`, `docker`, `ruby`, `swift`, `kotlin`, `r`, `dart`, `lua`, `powershell`, `xml` et `toml`.

Les alias courants tels que `js`, `ts`, `bash`, `md`, `yml`, `c++`, `dockerfile`, `rb`, `kt` et `ps1` sont normalisés vers ces langages par défaut.

Installez le plugin Diff Viewer Language Pack pour mettre en surbrillance d'autres langues :

```bash
openclaw plugins install clawhub:@openclaw/diffs-language-pack
```

Avec le pack de langage disponible, OpenClaw peut mettre en surbrillance beaucoup plus de langues. Si le pack n'est pas installé, les fichiers en dehors de la liste par défaut s'affichent toujours sous forme de texte brut lisible. Des exemples incluent Astro, Vue, Svelte, MDX, GraphQL, Terraform/HCL, Nix, Clojure, Elixir, Haskell, OCaml, Scala, Zig, Solidity, Verilog/VHDL, Fortran, MATLAB, LaTeX, Mermaid, Sass/Less/SCSS, Nginx, Apache, CSV, dotenv, INI, et les fichiers diff.

Voir le [plugin Diffs Language Pack](/fr/plugins/reference/diffs-language-pack) pour plus de détails et [Shiki languages](https://shiki.style/languages) pour le catalogue des langues et alias en amont de Shiki.

## Contrat des détails de sortie

L'outil renvoie des métadonnées structurées sous `details`.

<AccordionGroup>
  <Accordion title="Viewer fields">
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
  <Accordion title="File fields">
    Champs de fichier lors du rendu PNG ou PDF :

    - `artifactId`
    - `expiresAt`
    - `filePath`
    - `path` (même valeur que `filePath`, pour la compatibilité avec les outils de message)
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

| Mode     | Ce qui est renvoyé                                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"view"` | Champs de la visionneuse uniquement.                                                                                                                          |
| `"file"` | Champs de fichier uniquement, aucun artefact de visionneuse.                                                                                                  |
| `"both"` | Champs de la visionneuse plus champs de fichier. Si le rendu du fichier échoue, la visionneuse renvoie tout de même avec l'alias `fileError` et `imageError`. |

## Sections inchangées réduites

- La visionneuse peut afficher des lignes comme `N unmodified lines`.
- Les contrôles d'extension sur ces lignes sont conditionnels et ne sont pas garantis pour chaque type d'entrée.
- Les contrôles d'extension apparaissent lorsque le diff rendu contient des données de contexte extensibles, ce qui est typique pour les entrées avant et après.
- Pour de nombreuses entrées de correctif unifié, les corps de contexte omis ne sont pas disponibles dans les blocs de correctif analysés, la ligne peut donc apparaître sans contrôles d'extension. Ce comportement est attendu.
- `expandUnchanged` s'applique uniquement lorsqu'un contexte extensible existe.

## Valeurs par défaut du plugin

Définir les valeurs par défaut à l'échelle du plugin dans `~/.openclaw/openclaw.json` :

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

Les paramètres explicites du tool remplacent ces valeurs par défaut.

### Configuration de l'URL persistante du visualiseur

<ParamField path="viewerBaseUrl" type="string">
  Fallback appartenant au plugin pour les liens du visualiseur renvoyés lorsqu'un appel de tool ne passe pas `baseUrl`. Doit être `http` ou `https`, sans requête/hachage.
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
  `false` : les requêtes non-boucle locale vers les routes du visualiseur sont refusées. `true` : les visualiseurs distants sont autorisés si le chemin tokenisé est valide.
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
  - Jeton aléatoire (48 caractères hexadécimaux)
  - `createdAt` et `expiresAt`
  - chemin `viewer.html` stocké
- La durée de vie (TTL) par défaut de l'artefact est de 30 minutes si non spécifiée.
- La durée de vie maximale acceptée pour le visualiseur est de 6 heures.
- Le nettoyage s'exécute de manière opportuniste après la création de l'artefact.
- Les artefacts expirés sont supprimés.
- Le nettoyage de secours supprime les dossiers obsolètes de plus de 24 heures lorsque les métadonnées sont manquantes.

## URL du visualiseur et comportement réseau

Route du visualiseur :

- `/plugins/diffs/view/{artifactId}/{token}`

Ressources du visualiseur :

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`
- `/plugins/diffs-language-pack/assets/viewer.js` lorsque le diff utilise une langue du pack de langues du visualiseur de diff

Le document du visualiseur résout ces ressources par rapport à l'URL du visualiseur, un préfixe de chemin `baseUrl` facultatif est donc préservé pour les deux requêtes de ressources.

Comportement de construction de l'URL :

- Si le `baseUrl` de l'appel de tool est fourni, il est utilisé après validation stricte.
- Sinon, si le `viewerBaseUrl` du plugin est configuré, il est utilisé.
- Sans aucune de ces substitutions, l'URL du visualiseur par défaut est la boucle locale `127.0.0.1`.
- Si le mode de liaison de la passerelle est `custom` et que `gateway.customBindHost` est défini, cet hôte est utilisé.

Règles `baseUrl` :

- Doit être `http://` ou `https://`.
- La requête et le hachage sont rejetés.
- L'origine plus un chemin de base facultatif est autorisé.

## Modèle de sécurité

<AccordionGroup>
  <Accordion title="Durcissement de la visionneuse">
    - Boucle locale uniquement par défaut.
    - Chemins de la visionneuse tokenisés avec une validation stricte de l'ID et du jeton.
    - CSP de réponse de la visionneuse :
      - `default-src 'none'`
      - scripts et ressources provenant uniquement de self
      - aucune `connect-src` sortante
    - Limitation des échecs à distance lorsque l'accès à distance est activé :
      - 40 échecs par 60 secondes
      - verrouillage de 60 secondes (`429 Too Many Requests`)

  </Accordion>
  <Accordion title="Durcissement du rendu des fichiers">
    - Le routage des demandes du navigateur de capture d'écran est refusé par défaut.
    - Seules les ressources de visionneuse locale provenant de `http://127.0.0.1/plugins/diffs/assets/*` sont autorisées.
    - Les demandes réseau externes sont bloquées.

  </Accordion>
</AccordionGroup>

## Exigences du navigateur pour le mode fichier

`mode: "file"` et `mode: "both"` nécessitent un navigateur compatible Chromium.

Ordre de résolution :

<Steps>
  <Step title="Configuration">
    `browser.executablePath` dans la configuration OpenClaw.
  </Step>
  <Step title="Variables d'environnement">
    - `OPENCLAW_BROWSER_EXECUTABLE_PATH`
    - `BROWSER_EXECUTABLE_PATH`
    - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`

  </Step>
  <Step title="Repli de la plateforme">
    Repli de découverte de commande/chemin de la plateforme.
  </Step>
</Steps>

Texte d'échec courant :

- `Diff PNG/PDF rendering requires a Chromium-compatible browser...`

Corrigez en installant Chrome, Chromium, Edge ou Brave, ou en définissant l'une des options de chemin exécutable ci-dessus.

## Dépannage

<AccordionGroup>
  <Accordion title="Erreurs de validation des entrées">
    - `Provide patch or both before and after text.` — incluez à la fois `before` et `after`, ou fournissez `patch`.
    - `Provide either patch or before/after input, not both.` — ne mélangez pas les modes d'entrée.
    - `Invalid baseUrl: ...` — utilisez une origine `http(s)` avec un chemin optionnel, sans requête/hachage.
    - `{field} exceeds maximum size (...)` — réduisez la taille de la charge utile.
    - Large patch rejection — réduisez le nombre de fichiers de correctif ou le nombre total de lignes.

  </Accordion>
  <Accordion title="Accessibilité de la visionneuse">
    - L'URL de la visionneuse résout vers `127.0.0.1` par défaut.
    - Pour les scénarios d'accès à distance, soit :
      - définissez le `viewerBaseUrl` du plugin, ou
      - passez `baseUrl` par appel de tool, ou
      - utilisez `gateway.bind=custom` et `gateway.customBindHost`
    - Si `gateway.trustedProxies`Tailscale inclut une boucle locale pour un proxy sur le même hôte (par exemple Tailscale Serve), les requêtes brutes de visionneuse en boucle locale sans en-têtes IP client transférés échouent de manière sécurisée par conception.
    - Pour cette topologie de proxy :
      - préférez `mode: "file"` ou `mode: "both"` lorsque vous avez uniquement besoin d'une pièce jointe, ou
      - activez intentionnellement `security.allowRemoteViewer` et définissez le `viewerBaseUrl` du plugin ou passez un `baseUrl` proxy/public lorsque vous avez besoin d'une URL de visionneuse partageable
    - N'activez `security.allowRemoteViewer` que lorsque vous prévoyez un accès externe à la visionneuse.

  </Accordion>
  <Accordion title="La ligne des lignes non modifiées n'a pas de bouton d'extension">
    Cela peut arriver pour une entrée de correctif lorsque le correctif ne contient pas de contexte extensible. C'est normal et n'indique pas une défaillance de la visionneuse.
  </Accordion>
  <Accordion title="Artefact introuvable">
    - L'artefact a expiré en raison du TTL.
    - Le jeton ou le chemin a changé.
    - Le nettoyage a supprimé les données obsolètes.

  </Accordion>
</AccordionGroup>

## Conseils opérationnels

- Préférez `mode: "view"` pour les révisions interactives locales dans le canvas.
- Préférez `mode: "file"` pour les canaux de chat sortants qui nécessitent une pièce jointe.
- Gardez `allowRemoteViewer` désactivé sauf si votre déploiement nécessite des URL de visionneuse distante.
- Définissez des `ttlSeconds` explicites et courtes pour les diffs sensibles.
- Évitez d'envoyer des secrets dans l'entrée du diff lorsque ce n'est pas nécessaire.
- Si votre canal compresse agressivement les images (par exemple Telegram ou WhatsApp), préférez la sortie PDF (`fileFormat: "pdf"`).

<Note>Moteur de rendu de diff propulsé par [Diffs](https://diffs.com).</Note>

## Connexes

- [Navigateur](/fr/tools/browser)
- [Plugins](/fr/tools/plugin)
- [Aperçu des outils](/fr/tools)
