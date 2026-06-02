---
summary: "OpenClawAPICLIOpenClaw API de contrôle de navigateur, référence de CLI et actions de script"
read_when:
  - Scripting or debugging the agent browser via the local control API
  - Looking for the `openclaw browser` CLI reference
  - Adding custom browser automation with snapshots and refs
title: "APIAPI de contrôle de navigateur"
---

Pour la configuration et le dépannage, consultez [Navigateur](/fr/tools/browserAPI).
Cette page est la référence de l'API HTTP de contrôle local, de la `openclaw browser`CLI
CLI et des modèles de scripts (snapshots, refs, attentes, flux de débogage).

## API de contrôle (facultatif)

Pour les intégrations locales uniquement, la Gateway expose une petite API HTTP de bouclage :

- Statut/démarrage/arrêt : `GET /`, `POST /start`, `POST /stop`
- Onglets : `GET /tabs`, `POST /tabs/open`, `POST /tabs/focus`, `DELETE /tabs/:targetId`
- Instantané/capture d'écran : `GET /snapshot`, `POST /screenshot`
- Actions : `POST /navigate`, `POST /act`
- Crochets (hooks) : `POST /hooks/file-chooser`, `POST /hooks/dialog`
- Téléchargements : `POST /download`, `POST /wait/download`
- Autorisations : `POST /permissions/grant`
- Débogage : `GET /console`, `POST /pdf`
- Débogage : `GET /errors`, `GET /requests`, `POST /trace/start`, `POST /trace/stop`, `POST /highlight`
- Réseau : `POST /response/body`
- État : `GET /cookies`, `POST /cookies/set`, `POST /cookies/clear`
- État : `GET /storage/:kind`, `POST /storage/:kind/set`, `POST /storage/:kind/clear`
- Paramètres : `POST /set/offline`, `POST /set/headers`, `POST /set/credentials`, `POST /set/geolocation`, `POST /set/media`, `POST /set/timezone`, `POST /set/locale`, `POST /set/device`

Tous les points de terminaison acceptent `?profile=<name>`. `POST /start?headless=true` demande un
lancement headless ponctuel pour les profils gérés localement sans modifier la
configuration persistante du navigateur ; les profils attach-only, CDP distant et de session existante rejettent ce remplacement car OpenClaw ne lance pas ces processus de navigateur.

Si l'authentification de passerelle par secret partagé est configurée, les routes HTTP du navigateur nécessitent également une authentification :

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` ou authentification HTTP Basic avec ce mot de passe

Notes :

- Cette API de navigateur en boucle locale autonome ne consomme **pas** les en-têtes d'identité
  de proxy approuvé ou API Serve.
- Si `gateway.auth.mode` est `none` ou `trusted-proxy`, ces routes de
  bouclage de navigateur n'héritent pas de ces modes porteurs d'identité ; gardez-les en bouclage uniquement.

### Contrat d'erreur `/act`

`POST /act` utilise une réponse d'erreur structurée pour la validation au niveau de la route et
les échecs de stratégie :

```json
{ "error": "<message>", "code": "ACT_*" }
```

Valeurs `code` actuelles :

- `ACT_KIND_REQUIRED` (HTTP 400) : `kind` est manquant ou non reconnu.
- `ACT_INVALID_REQUEST` (HTTP 400) : la charge utile de l'action a échoué à la normalisation ou à la validation.
- `ACT_SELECTOR_UNSUPPORTED` (HTTP 400) : `selector` a été utilisé avec un type d'action non pris en charge.
- `ACT_EVALUATE_DISABLED` (HTTP 403) : `evaluate` (ou `wait --fn`) est désactivé par la configuration.
- `ACT_TARGET_ID_MISMATCH` (HTTP 403) : le `targetId` de niveau supérieur ou par lot est en conflit avec la cible de la requête.
- `ACT_EXISTING_SESSION_UNSUPPORTED` (HTTP 501) : l'action n'est pas prise en charge pour les profils de session existante.

D'autres échecs d'exécution peuvent toujours renvoyer `{ "error": "<message>" }` sans champ
`code`.

### Configuration requise pour Playwright

Certaines fonctionnalités (navigation/action/AI snapshot/role snapshot, captures d'écran d'éléments,
PDF) nécessitent Playwright. Si Playwright n'est pas installé, ces points de terminaison renvoient
une erreur 501 claire.

Ce qui fonctionne toujours sans Playwright :

- Snapshots ARIA
- Instantanés d'accessibilité de style rôle (`--interactive`, `--compact`,
  `--depth`, `--efficient`) lorsqu'un WebSocket CDP par onglet est disponible. Il s'agit
  d'un repli pour l'inspection et la découverte de références ; Playwright reste le moteur d'action principal.
- Captures d'écran de page pour le navigateur `openclaw` géré lorsqu'un WebSocket CDP
  par onglet est disponible
- Captures d'écran de page pour les profils `existing-session` / Chrome MCP
- `existing-session` captures d'écran basés sur des références (`--ref`) à partir de la sortie de l'instantané

Ce qui nécessite encore Playwright :

- `navigate`
- `act`
- Snapshots AI qui dépendent du format de snapshot natif de Playwright
- Captures d'écran d'éléments par sélecteur CSS (`--element`)
- Exportation PDF complète du navigateur

Les captures d'écran d'éléments rejettent également `--full-page` ; la route renvoie `fullPage is
not supported for element screenshots`.

Si vous voyez `Playwright is not available in this gateway build`, il manque une dépendance d'exécution du navigateur principale au Gateway empaqueté. Réinstallez ou mettez à jour
OpenClaw, puis redémarrez la passerelle. Pour Docker, installez également les binaires
du navigateur Chromium comme indiqué ci-dessous.

#### Installation de Docker Playwright

Si votre Gateway s'exécute dans Docker, évitez `npx playwright` (conflits de substitution npm).
Pour les images personnalisées, intégrez Chromium à l'image :

```bash
OPENCLAW_INSTALL_BROWSER=1 ./scripts/docker/setup.sh
```

Pour une image existante, installez via le CLI inclus à la place :

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

Pour conserver les téléchargements du navigateur, définissez `PLAYWRIGHT_BROWSERS_PATH` (par exemple,
`/home/node/.cache/ms-playwright`) et assurez-vous que `/home/node` est conservé via
`OPENCLAW_HOME_VOLUME` ou un montage de liaison (bind mount). OpenClaw détecte automatiquement le
Chromium conservé sur Linux. Voir [Docker](/fr/install/docker).

## Fonctionnement (interne)

Un petit serveur de contrôle de boucle locale accepte les requêtes HTTP et se connecte aux navigateurs basés sur Chromium via CDP. Les actions avancées (clic/taper/instantané/PDF) passent par Playwright au-dessus de CDP ; lorsque Playwright est manquant, seules les opérations non Playwright sont disponibles. L'agent voit une interface stable tandis que les navigateurs et profils locaux/distants s'échangent librement en dessous.

## Référence rapide CLI

Toutes les commandes acceptent `--browser-profile <name>` pour cibler un profil spécifique, et `--json` pour une sortie lisible par machine.

<AccordionGroup>

<Accordion title="Bases : statut, onglets, ouvrir/focus/fermer">

```bash
openclaw browser status
openclaw browser start
openclaw browser start --headless # one-shot local managed headless launch
openclaw browser stop            # also clears emulation on attach-only/remote CDP
openclaw browser tabs
openclaw browser tab             # shortcut for current tab
openclaw browser tab new
openclaw browser tab select 2
openclaw browser tab close 2
openclaw browser open https://example.com
openclaw browser focus abcd1234
openclaw browser close abcd1234
```

</Accordion>

<Accordion title="Inspection : capture d'écran, instantané, console, erreurs, requêtes">

```bash
openclaw browser screenshot
openclaw browser screenshot --full-page
openclaw browser screenshot --ref 12        # or --ref e12
openclaw browser screenshot --labels
openclaw browser snapshot
openclaw browser snapshot --format aria --limit 200
openclaw browser snapshot --interactive --compact --depth 6
openclaw browser snapshot --efficient
openclaw browser snapshot --labels
openclaw browser snapshot --urls
openclaw browser snapshot --selector "#main" --interactive
openclaw browser snapshot --frame "iframe#main" --interactive
openclaw browser console --level error
openclaw browser errors --clear
openclaw browser requests --filter api --clear
openclaw browser pdf
openclaw browser responsebody "**/api" --max-chars 5000
```

</Accordion>

<Accordion title="Actions : naviguer, cliquer, taper, faire glisser, attendre, évaluer">

```bash
openclaw browser navigate https://example.com
openclaw browser resize 1280 720
openclaw browser click 12 --double           # or e12 for role refs
openclaw browser click-coords 120 340        # viewport coordinates
openclaw browser type 23 "hello" --submit
openclaw browser press Enter
openclaw browser hover 44
openclaw browser scrollintoview e12
openclaw browser drag 10 11
openclaw browser select 9 OptionA OptionB
openclaw browser download e12 report.pdf
openclaw browser waitfordownload report.pdf
openclaw browser upload /tmp/openclaw/uploads/file.pdf
openclaw browser upload media://inbound/file.pdf
openclaw browser fill --fields '[{"ref":"1","type":"text","value":"Ada"}]'
openclaw browser dialog --accept
openclaw browser dialog --dismiss --dialog-id d1
openclaw browser wait --text "Done"
openclaw browser wait "#main" --url "**/dash" --load networkidle --fn "window.ready===true"
openclaw browser evaluate --fn '(el) => el.textContent' --ref 7
openclaw browser evaluate --timeout-ms 30000 --fn 'async () => { await window.ready; return true; }'
openclaw browser highlight e12
openclaw browser trace start
openclaw browser trace stop
```

</Accordion>

<Accordion title="État : cookies, stockage, hors ligne, en-têtes, géo, appareil">

```bash
openclaw browser cookies
openclaw browser cookies set session abc123 --url "https://example.com"
openclaw browser cookies clear
openclaw browser storage local get
openclaw browser storage local set theme dark
openclaw browser storage session clear
openclaw browser set offline on
openclaw browser set headers --headers-json '{"X-Debug":"1"}'
openclaw browser set credentials user pass            # --clear to remove
openclaw browser set geo 37.7749 -122.4194 --origin "https://example.com"
openclaw browser set media dark
openclaw browser set timezone America/New_York
openclaw browser set locale en-US
openclaw browser set device "iPhone 14"
```

</Accordion>

</AccordionGroup>

Notes :

- `upload` et `dialog` sont des appels d'**armement** ; exécutez-les avant le clic/appui qui déclenche le sélecteur/la boîte de dialogue. Si une action ouvre une fenêtre modale, la réponse de l'action inclut `blockedByDialog` et `browserState.dialogs.pending` ; transmettez ce `dialogId` pour répondre directement. Les boîtes de dialogue gérées en dehors de OpenClaw apparaissent sous `browserState.dialogs.recent`.
- `click`/`type`/etc nécessitent un `ref` de `snapshot` (référence numérique `12`, référence de rôle `e12`, ou référence ARIA actionnable `ax12`). Les sélecteurs CSS ne sont intentionnellement pas pris en charge pour les actions. Utilisez `click-coords` lorsque la position dans la fenêtre d'affichage visible est la seule cible fiable.
- Les chemins de téléchargement et de trace sont limités aux racines temporaires OpenClaw : `/tmp/openclaw{,/downloads}` (secours : `${os.tmpdir()}/openclaw/...`).
- `upload` accepte les fichiers de la racine des téléchargements temporaires OpenClaw et
  les médias entrants gérés par OpenClaw. Les médias entrants gérés peuvent être référencés comme
  `media://inbound/<id>`, `media/inbound/<id>` relatif au bac à sable, ou un chemin résolu
  à l'intérieur du répertoire des médias entrants gérés. Les références de médias imbriquées,
  les traversals, les liens symboliques, les liens physiques et les chemins locaux arbitraires sont toujours rejetés.
- `upload` peut également définir directement les entrées de fichiers via `--input-ref` ou `--element`.

Les identifiants et les étiquettes d'onglets stables survivent au remplacement des cibles brutes Chromium lorsque OpenClaw
peut prouver l'onglet de remplacement, tel que la même URL ou un seul vieil onglet devenant un
seul nouvel onglet après la soumission du formulaire. Les identifiants de cibles brutes sont toujours volatiles ; préférez
`suggestedTargetId` de `tabs` dans les scripts.

Indicateurs de snapshot en un coup d'œil :

- `--format ai` (par défaut avec Playwright) : snapshot IA avec références numériques (`aria-ref="<n>"`).
- `--format aria` : arborescence d'accessibilité avec des références `axN` . Lorsque Playwright est disponible, OpenClaw lie les références aux identifiants DOM du backend vers la page active afin que les actions suivantes puissent les utiliser ; sinon, traitez la sortie comme une inspection uniquement.
- `--efficient` (ou `--mode efficient` ) : préréglage de snapshot de rôle compact. Définissez `browser.snapshotDefaults.mode: "efficient"` pour en faire la valeur par défaut (voir [Gateway configuration](/fr/gateway/configuration-reference#browser)).
- `--interactive` , `--compact` , `--depth` , `--selector` forcent un snapshot de rôle avec des références `ref=e12` . `--frame "<iframe>"` délimite les snapshots de rôle à une iframe.
- `--labels` ajoute une capture d'écran de la seule fenêtre d'affichage avec des étiquettes de référence superposées et imprime le chemin enregistré.
- `--urls` ajoute les destinations de lien découvertes aux snapshots IA.

## Snapshots et références

OpenClaw prend en charge deux styles de « snapshot » :

- **Snapshot IA (références numériques)** : `openclaw browser snapshot` (par défaut ; `--format ai`)
  - Sortie : un instantané texte incluant des références numériques.
  - Actions : `openclaw browser click 12` , `openclaw browser type 23 "hello"` .
  - En interne, la référence est résolue via `aria-ref` de Playwright.

- **Snapshot de rôle (références de rôle comme `e12` )** : `openclaw browser snapshot --interactive` (ou `--compact` , `--depth` , `--selector` , `--frame`)
  - Sortie : une liste/arborescence basée sur les rôles avec `[ref=e12]` (et `[nth=1]` optionnel).
  - Actions : `openclaw browser click e12` , `openclaw browser highlight e12` .
  - En interne, la référence est résolue via `getByRole(...)` (plus `nth()` pour les doublons).
  - Ajoutez `--labels` pour inclure une capture d'écran de la fenêtre d'affichage avec des étiquettes `e12` superposées.
  - Ajoutez `--urls` lorsque le texte du lien est ambigu et que l'agent a besoin de cibles de navigation concrètes.

- **Snapshot ARIA (références ARIA comme `ax12`)** : `openclaw browser snapshot --format aria`
  - Sortie : l'arbre d'accessibilité sous forme de nœuds structurés.
  - Actions : `openclaw browser click ax12` fonctionne lorsque le chemin du snapshot peut lier la référence via Playwright et les identifiants DOM du backend Chrome.
- Si Playwright n'est pas disponible, les snapshots ARIA peuvent toujours être utiles pour l'inspection, mais les références peuvent ne pas être actionnables. Re-snapshottez avec `--format ai` ou `--interactive` lorsque vous avez besoin de références d'action.
- Preuve Docker pour le chemin de repli raw-CDP : `pnpm test:docker:browser-cdp-snapshot` démarre Chromium avec CDP, exécute `browser doctor --deep`, et vérifie que les snapshots de rôle incluent les URL des liens, les éléments cliquables promus par le curseur, et les métadonnées des iframes.

Comportement des références :

- Les références **ne sont pas stables entre les navigations** ; si quelque chose échoue, réexécutez `snapshot` et utilisez une nouvelle référence.
- `/act` renvoie l'`targetId` brut actuel après un remplacement déclenché par une action lorsqu'il peut prouver l'onglet de remplacement. Continuez à utiliser des identifiants/labels d'onglet stables pour les commandes de suivi.
- Si le snapshot de rôle a été pris avec `--frame`, les références de rôle sont limitées à cet iframe jusqu'au prochain snapshot de rôle.
- Les références `axN` inconnues ou obsolètes échouent rapidement au lieu de revenir au sélecteur `aria-ref` de Playwright. Exécutez un nouveau snapshot sur le même onglet lorsque cela se produit.

## Améliorations d'attente

Vous pouvez attendre plus que le temps/le texte :

- Attendre une URL (globs pris en charge par Playwright) :
  - `openclaw browser wait --url "**/dash"`
- Attendre l'état de chargement :
  - `openclaw browser wait --load networkidle`
- Attendre un prédicat JS :
  - `openclaw browser wait --fn "window.ready===true"`
- Attendre qu'un sélecteur devienne visible :
  - `openclaw browser wait "#main"`

Ces éléments peuvent être combinés :

```bash
openclaw browser wait "#main" \
  --url "**/dash" \
  --load networkidle \
  --fn "window.ready===true" \
  --timeout-ms 15000
```

## Workflows de débogage

Lorsqu'une action échoue (par exemple, "non visible", "violation du mode strict", "couvert") :

1. `openclaw browser snapshot --interactive`
2. Utilisez `click <ref>` / `type <ref>` (préférez les références de rôle en mode interactif)
3. Si cela échoue toujours : `openclaw browser highlight <ref>` pour voir ce que Playwright cible
4. Si la page se comporte de manière étrange :
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. Pour un débogage approfondi : enregistrez une trace :
   - `openclaw browser trace start`
   - reproduisez le problème
   - `openclaw browser trace stop` (imprime `TRACE:<path>`)

## Sortie JSON

`--json` est destiné au scriptage et aux outils structurés.

Exemples :

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

Les instantanés de rôle (snapshots) en JSON incluent `refs` ainsi qu'un petit bloc `stats` (lignes/caractères/réfs/interactif) pour que les outils puissent évaluer la taille et la densité de la charge utile.

## Contrôles d'état et d'environnement

Ceci est utile pour les workflows du type « faire se comporter le site comme X » :

- Cookies : `cookies`, `cookies set`, `cookies clear`
- Stockage : `storage local|session get|set|clear`
- Hors ligne : `set offline on|off`
- En-têtes : `set headers --headers-json '{"X-Debug":"1"}'` (l'ancien `set headers --json '{"X-Debug":"1"}'` reste pris en charge)
- Authentification HTTP basique : `set credentials user pass` (ou `--clear`)
- Géolocalisation : `set geo <lat> <lon> --origin "https://example.com"` (ou `--clear`)
- Média : `set media dark|light|no-preference|none`
- Fuseau horaire / langue : `set timezone ...`, `set locale ...`
- Appareil / zone d'affichage (viewport) :
  - `set device "iPhone 14"` (préréglages d'appareils Playwright)
  - `set viewport 1280 720`

## Sécurité et confidentialité

- Le profil de navigateur openclaw peut contenir des sessions connectées ; traitez-le comme sensible.
- `browser act kind=evaluate` / `openclaw browser evaluate` et `wait --fn`
  exécutent du JavaScript arbitraire dans le contexte de la page. L'injection de prompt peut
  influencer cela. Désactivez-le avec `browser.evaluateEnabled=false` si vous n'en avez pas besoin.
- Utilisez `openclaw browser evaluate --timeout-ms <ms>` lorsque la fonction côté page
  peut avoir besoin de plus de temps que le délai d'évaluation par défaut.
- Pour les notes sur les connexions et les anti-bots (X/Twitter, etc.), voir [Connexion au navigateur + publication sur X/Twitter](/fr/tools/browser-login).
- Gardez l'hôte Gateway/node privé (bouclage ou tailnet uniquement).
- Les points de terminaison CDP distants sont puissants ; placez-les dans un tunnel et protégez-les.

Exemple en mode strict (bloquer les destinations privées/interne par défaut) :

```json5
{
  browser: {
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: false,
      hostnameAllowlist: ["*.example.com", "example.com"],
      allowedHostnames: ["localhost"], // optional exact allow
    },
  },
}
```

## Connexes

- [Browser](/fr/tools/browser) - vue d'ensemble, configuration, profils, sécurité
- [Browser login](/fr/tools/browser-login) - connexion aux sites
- [Browser Linux troubleshooting](Linux/en/tools/browser-linux-troubleshooting)
- [Browser WSL2 troubleshooting](WSL2/en/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
