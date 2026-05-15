---
summary: "Manuel de l'opérateur pour les QA Mantis Slack desktop : dispatch GitHub, CLI local, baux VNC chauds, modes d'hydratation, interprétation du timing, artefacts et gestion des échecs."
read_when:
  - Running Mantis Slack desktop QA from GitHub or locally
  - Debugging slow Mantis Slack desktop runs
  - Choosing source, prehydrated, or warm-lease mode
  - Posting screenshot and video evidence to a PR
title: "Manuel d'exécution Mantis Slack desktop"
---

Le QA Mantis Slack desktop est la voie d'interface utilisateur réelle pour les bugs de classe Slack nécessitant un bureau Linux, une secours VNC, Slack Web, une passerelle OpenClaw réelle, des captures d'écran, des vidéos et un commentaire de preuve sur la PR.

Utilisez-le lorsque les tests unitaires ou la voie en direct Slack sans interface ne peuvent pas prouver le bug.

## Modèle de stockage

Mantis utilise trois différentes couches de stockage :

- Image du fournisseur : détenue par Crabbox et stockée dans le compte du fournisseur cloud.
  Elle contient des capacités machine telles que Chrome/Chromium, ffmpeg, scrot,
  Node/corepack/pnpm, les outils de build natifs, et des répertoires de cache vides.
- État du bail chaud : détenu par la session de l'opérateur actuel. Il peut contenir un
  profil de navigateur connecté, `/var/cache/crabbox/pnpm`, et une extraction de source
  préparée tant que le bail est actif.
- Artefacts Mantis : détenus par l'exécution OpenClaw. Ils résident sous
  `.artifacts/qa-e2e/mantis/...`, puis GitHub Actions les téléverse et l'application
  Mantis GitHub commente les preuves en ligne sur la PR.

Ne mettez jamais de secrets, de cookies de navigateur, l'état de connexion Slack, des extraits de dépôt,
`node_modules`, ou `dist/` dans une image de fournisseur préconfectionnée.

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

Les valeurs `candidate_ref` autorisées sont intentionnellement restreintes car le workflow
utilise des identifiants en direct : l'ascendance `main` actuelle, les balises de version, ou la tête d'une PR ouverte
de `openclaw/openclaw`.

Le workflow écrit :

- artefact téléversé : `mantis-slack-desktop-smoke-<run-id>-<attempt>` ;
- commentaire PR en ligne de l'application Mantis GitHub ;
- `slack-desktop-smoke.png` ;
- `slack-desktop-smoke.mp4` ;
- `slack-desktop-smoke-preview.gif` ;
- `slack-desktop-smoke-change.mp4` ;
- `mantis-slack-desktop-smoke-summary.json` ;
- `mantis-slack-desktop-smoke-report.md` ;
- les journaux distants tels que `slack-desktop-command.log`, `openclaw-gateway.log`,
  `chrome.log` et `ffmpeg.log`.

Le commentaire de PR est mis à jour sur place par le marqueur masqué
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
`node_modules` et un `dist/` construit. Mantis échoue de manière fermée si ceux-ci sont
manquants.

## Modes d'hydratation

| Mode          | Utiliser quand                                         | Comportement distant                                                                             | Compromis                                                                      |
| ------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `source`      | Preuve normale de PR, machines à froid, CI             | Exécute `pnpm install --frozen-lockfile --prefer-offline` et `pnpm build` à l'intérieur de la VM | Le plus lent, plus forte preuve de checkout source                             |
| `prehydrated` | Vous avez intentionnellement préparé un bail réutilisé | Nécessite `node_modules` et `dist/` existants ; ignore l'installation/build                      | Rapide, mais valide uniquement pour les baux à chaud contrôlés par l'opérateur |

Les actions GitHub préparent toujours le checkout candidat avant l'exécution de la VM. Son
magasin pnpm est mis en cache par OS, version Node et fichier de verrouillage. L'exécution de la source VM utilise également
`/var/cache/crabbox/pnpm` lorsqu'il est présent.

## Interprétation du timing

`mantis-slack-desktop-smoke-report.md` inclut les timings de phase :

- `crabbox.warmup` : démarrage du fournisseur cloud, préparation du bureau/navigateur et SSH.
- `crabbox.inspect` : recherche des métadonnées de bail.
- `credentials.prepare` : acquisition du bail d'identifiants Convex.
- `crabbox.remote_run` : synchronisation, lancement du navigateur, installation/build OpenClaw ou
  validation d'hydratation, démarrage de la passerelle, capture d'écran et vidéo.
- `artifacts.copy` : rsync retour depuis la VM.

`crabbox.remote_run` peut être marqué `accepted` lorsque Crabbox renvoie un statut distant non nul après que Mantis a copié les métadonnées prouvant que la passerelle OpenClaw est active et que la configuration est terminée. Traitez `accepted` comme un succès avec explication, et non comme un scénario échoué.

Si l'exécution est lente :

- si l'échauffement domine : prépréparez ou promouvez une meilleure image de fournisseur Crabbox ;
- si remote_run domine dans `source` : utilisez un bail à chaud (warm lease), améliorez la réutilisation du magasin pnpm, ou déplacez les prérequis de la machine dans l'image du fournisseur ;
- si remote_run domine dans `prehydrated` : l'espace de travail distant n'était pas réellement prêt, ou la configuration de la passerelle/du navigateur/de Slack est lente ;
- si la copie d'artefacts domine : inspectez la taille de la vidéo et le contenu du répertoire d'artefacts.

## Liste de vérification des preuves

Un bon commentaire de PR doit montrer :

- l'identifiant du scénario et le SHA du candidat ;
- l'URL d'exécution des Actions GitHub ;
- l'URL de l'artefact ;
- une capture d'écran en ligne ;
- un aperçu animé en ligne si disponible ;
- les liens MP4 complets et MP4 coupés ;
- le statut de succès/échec ;
- le résumé du timing dans le rapport joint.

Ne commitez pas de captures d'écran ou de vidéos dans le dépôt. Conservez-les dans les artefacts des Actions GitHub ou dans le commentaire de la PR.

## Gestion des échecs

Si le workflow échoue avant l'exécution de la VM, inspectez d'abord le travail Actions. Les causes typiques sont des entrées `candidate_ref` non fiables, des secrets d'environnement manquants, ou un échec de l'installation/de la construction du candidat.

Si l'exécution de la VM échoue mais que des captures d'écran ont été copiées, inspectez :

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

Si la connexion Slack a expiré, réparez-la via VNC sur un bail conservé et relancez avec
`--lease-id`. N'intégrez pas ce profil de navigateur dans une image de fournisseur.

## Liens connexes

- [Aperçu QA](/fr/concepts/qa-e2e-automation)
- [Canal Slack](/fr/channels/slack)
- [Tests](/fr/help/testing)
