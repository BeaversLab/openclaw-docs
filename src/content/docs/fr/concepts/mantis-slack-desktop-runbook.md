---
summary: "SlackGitHubCLIManuel de l'opérateur pour les tests QA Mantis Slack Desktop : dispatch GitHub, CLI locale, baux VNC chauds, modes d'hydratation, interprétation du timing, artefacts et gestion des échecs."
read_when:
  - Running Mantis Slack desktop QA from GitHub or locally
  - Debugging slow Mantis Slack desktop runs
  - Choosing source, prehydrated, or warm-lease mode
  - Posting screenshot and video evidence to a PR
title: "SlackManuel d'exécution Mantis Slack Desktop"
---

Le QA Mantis Slack desktop est la voie d'interface utilisateur réelle pour les bugs de classe Slack nécessitant un bureau Linux, une secours VNC, Slack Web, une passerelle OpenClaw réelle, des captures d'écran, des vidéos et un commentaire de preuve sur la PR.

Utilisez-le lorsque les tests unitaires ou la voie en direct Slack sans interface ne peuvent pas prouver le bug.

## Modèle de stockage

Mantis utilise trois différentes couches de stockage :

- Image du fournisseur : détenue par Crabbox et stockée dans le compte du fournisseur cloud.
  Elle contient des capacités machine telles que Chrome/Chromium, ffmpeg, scrot,
  Node/corepack/pnpm, les outils de build natifs, et des répertoires de cache vides.
- État de bail chaud : détenu par la session de l'opérateur actuel. Il peut contenir un
  profil de navigateur connecté, `/var/cache/crabbox/pnpm` et une extraction de source
  préparée tant que le bail est actif.
- Artefacts Mantis : détenus par l'exécution OpenClaw. Ils résident sous
  OpenClaw`.artifacts/qa-e2e/mantis/...`GitHubGitHub, puis GitHub Actions les téléverse et l'application
  Mantis GitHub App commente les preuves en ligne sur la PR.

Ne mettez jamais de secrets, de cookies de navigateur, l'état de connexion Slack,
des extractions de dépôt, Slack`node_modules` ou `dist/` dans une image de fournisseur préfabriquée.

## Dispatch GitHub

Exécutez le workflow à partir de `main` :

```bash
gh workflow run mantis-slack-desktop-smoke.yml \
  --ref main \
  -f candidate_ref=<trusted-ref-or-sha> \
  -f pr_number=<pr-number> \
  -f scenario_id=slack-canary \
  -f crabbox_provider=aws \
  -f keep_vm=false \
  -f hydrate_mode=source
```

Les valeurs `candidate_ref` autorisées sont intentionnellement limitées car le workflow
utilise des informations d'identification en direct : l'ascendance actuelle de `main`, les tags de version, ou la tête d'une PR ouverte
depuis `openclaw/openclaw`.

Le workflow écrit :

- artefact téléversé : `mantis-slack-desktop-smoke-<run-id>-<attempt>` ;
- commentaire PR en ligne de l'application Mantis GitHub ;
- `slack-desktop-smoke.png` ;
- `slack-desktop-smoke.mp4` ;
- `slack-desktop-smoke-preview.gif` ;
- `slack-desktop-smoke-change.mp4` ;
- `mantis-slack-desktop-smoke-summary.json` ;
- `mantis-slack-desktop-smoke-report.md` ;
- journaux distants tels que `slack-desktop-command.log`, `openclaw-gateway.log`,
  `chrome.log` et `ffmpeg.log`.

Le commentaire de PR est mis à jour sur place par le marqueur caché
`<!-- mantis-slack-desktop-smoke -->`.

## CLI local

Preuve de source à froid :

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --provider aws \
  --class standard \
  --gateway-setup \
  --credential-source convex \
  --credential-role maintainer \
  --provider-mode live-frontier \
  --model openai/gpt-5.4 \
  --alt-model openai/gpt-5.4 \
  --scenario slack-canary \
  --hydrate-mode source
```

Conserver la VM pour le secours VNC :

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --provider aws \
  --class standard \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

Ouvrir VNC :

```bash
crabbox vnc --provider aws --id <cbx_id> --open
```

Réutiliser un bail à chaud :

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --provider aws \
  --lease-id <cbx_id-or-slug> \
  --gateway-setup \
  --scenario slack-canary \
  --hydrate-mode source
```

Utilisez `--hydrate-mode prehydrated` uniquement lorsque l'espace de travail distant réutilisé possède déjà
`node_modules` et un `dist/` construit. Mantis échoue en mode fermé si ceux-ci sont
manquants.

Prouver l'UI d'approbation native Slack :

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --provider aws \
  --class standard \
  --approval-checkpoints \
  --credential-source convex \
  --credential-role maintainer \
  --hydrate-mode source
```

Le mode de point de contrôle d'approbation est mutuellement exclusif avec `--gateway-setup`. Il exécute les scénarios `slack-approval-exec-native` et `slack-approval-plugin-native` en option, sauf si vous passez des indicateurs de point de contrôle d'approbation explicites `--scenario` ; les autres scénarios Slack sont rejetés avant le démarrage de la VM. Le lanceur QA Slack écrit chaque fichier JSON de point de contrôle à partir du message réel de l'Slack API observé, puis l'observateur distant rend cette capture de message en `approval-checkpoints/<scenario>-pending.png` et `approval-checkpoints/<scenario>-resolved.png`. L'exécution échoue si un fichier JSON de point de contrôle, une preuve de message, un JSON d'accusé de réception ou une capture d'écran rendue est manquant ou vide.

Les baux froids d'Actions GitHub n'ont pas de cookies Web Slack, leur capture de navigateur peut donc atterrir sur la page de connexion Slack. Pour la preuve de point de contrôle d'approbation, faites confiance aux images de point de contrôle rendues et aux artefacts QA Slack plutôt qu'à `slack-desktop-smoke.png`. Utilisez un bail chaud conservé avec un profil Web Slack connecté manuellement uniquement lorsque la capture d'écran du navigateur doit afficher Web Slack.

## Modes d'hydratation

| Mode          | Utiliser quand                                         | Comportement distant                                                                             | Compromis                                                                     |
| ------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `source`      | Preuve normale de PR, machines froides, CI             | Exécute `pnpm install --frozen-lockfile --prefer-offline` et `pnpm build` à l'intérieur de la VM | Le plus lent, preuve source-checkout la plus forte                            |
| `prehydrated` | Vous avez intentionnellement préparé un bail réutilisé | Nécessite `node_modules` et `dist/` existants ; ignore l'installation/build                      | Rapide, mais valide uniquement pour les baux chauds contrôlés par l'opérateur |

Les Actions GitHub préparent toujours le checkout candidat avant l'exécution de la VM. Son magasin pnpm est mis en cache par OS, version de Node et fichier de verrouillage. L'exécution source de la VM utilise également `/var/cache/crabbox/pnpm` lorsque présent.

## Interprétation du timing

`mantis-slack-desktop-smoke-report.md` inclut les timings de phase :

- `crabbox.warmup` : démarrage du fournisseur cloud, disponibilité du bureau/navigateur et SSH.
- `crabbox.inspect` : recherche des métadonnées de bail.
- `credentials.prepare` : Acquisition du bail d'identifiants Convex.
- `crabbox.remote_run` : synchronisation, lancement du navigateur, installation/construction OpenClaw ou
  validation de l'hydratation, démarrage de la passerelle, capture d'écran et vidéo.
- `artifacts.copy` : rsync de retour depuis la VM.

`crabbox.remote_run` peut être marqué `accepted` lorsque Crabbox renvoie un statut distant non nul
après que Mantis a copié des métadonnées prouvant que soit la configuration de la passerelle OpenClaw
est terminée, soit que la commande QA Slack elle-même s'est terminée avec succès.
Traitez `accepted` comme une réussite avec explication, et non comme un scénario d'échec.

Si l'exécution est lente :

- l'échauffement domine : pré-préparez ou promouvez une meilleure image provider Crabbox ;
- remote_run domine dans `source` : utilisez un bail chaud, améliorez la réutilisation du magasin pnpm,
  ou déplacez les prérequis de la machine dans l'image provider ;
- remote_run domine dans `prehydrated` : l'espace de travail distant n'était pas réellement
  prêt, ou la configuration de la passerelle/navigateur/Slack est lente ;
- la copie d'artefact domine : inspectez la taille de la vidéo et le contenu du répertoire d'artefacts.

## Liste de contrôle des preuves

Un bon commentaire de PR doit montrer :

- l'identifiant du scénario et le SHA du candidat ;
- l'URL de l'exécution des Actions GitHub ;
- l'URL de l'artefact ;
- une capture d'écran du point de contrôle d'approbation en ligne, ou une capture d'écran de Slack Web à partir d'un
  bail chaud connecté ;
- un aperçu animé en ligne, si disponible ;
- les liens MP4 complets et MP4 réduits ;
- le statut réussite/échec ;
- le résumé du timing dans le rapport joint.

Ne commitez pas de captures d'écran ou de vidéos dans le dépôt. Gardez-les dans les artefacts des Actions GitHub
ou dans le commentaire de PR.

## Gestion des échecs

Si le workflow échoue avant l'exécution de la VM, inspectez d'abord le job Actions. Les causes
typiques sont des `candidate_ref` non approuvés, des secrets d'environnement manquants, ou un échec
d'installation/construction du candidat.

Si l'exécution de la VM échoue mais que des captures d'écran ont été recopiées, inspectez :

```bash
cat mantis-slack-desktop-smoke-report.md
cat mantis-slack-desktop-smoke-summary.json
cat slack-desktop-command.log
cat openclaw-gateway.log
cat chrome.log
cat ffmpeg.log
```

Si l'exécution a conservé le bail, ouvrez VNC avec la commande `crabbox vnc ...` du rapport.
Arrêtez le bail une fois terminé :

```bash
crabbox stop --provider aws <cbx_id-or-slug>
```

Si la connexion Slack a expiré, réparez-la dans VNC sur un bail conservé et relancez avec
`--lease-id`. Ne incorporez pas ce profil de navigateur dans une image de provider.

## Connexes

- [Aperçu QA](/fr/concepts/qa-e2e-automation)
- [Channel Slack](/fr/channels/slack)
- [Tests](/fr/help/testing)
