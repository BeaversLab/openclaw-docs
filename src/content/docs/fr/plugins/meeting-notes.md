---
summary: "DiscordPlugin Meeting Notes : capturer des transcriptions depuis la voix Discord et les sources de réunion importées, puis rédiger des résumés"
read_when:
  - You want OpenClaw to take meeting notes
  - You are wiring Discord voice, Google Meet, Slack huddles, or another meeting source into notes
  - You need the meeting_notes tool contract
title: "Plugin Meeting Notes"
---

Le plugin Meeting Notes est la couche de notes générique pour les appels en direct et les transcriptions de réunion importées. Il gère le stockage des transcriptions, le rendu des résumés et l'outil `meeting_notes`. Les plugins de canal gèrent la capture, l'authentification et les jointures de réunion spécifiques à la plateforme.

Utilisez cette page lorsque vous voulez qu'OpenClawDiscord capture les notes vocales Discord aujourd'hui, lorsque vous voulez importer une transcription d'un autre système de réunion, ou lorsque vous créez un fournisseur de source Google Meet, Slack huddle, Zoom ou propriétaire de calendrier.

## Modèle de source

Les sources de réunion enregistrent `meetingNotesSourceProviders` via le SDK de plugin.
Le premier fournisseur en direct est `discord-voice` ; le fournisseur intégré `manual-transcript`
importe les transcriptions après réunion.

- `live-audio` : la source rejoint ou écoute un appel et diffuse les énoncés finaux.
- `live-caption` : la source lit les sous-titres depuis un navigateur ou une surface de réunion.
- `posthoc-transcript` : la source importe une transcription ou un artefact de notes après la réunion.
- `recording-stt` : la source transcrit un enregistrement avant d'importer les énoncés.

Cela permet de garder Discord, Google Meet, les Slack huddles et les futures surfaces de réunion hors du moteur de notes. Chaque source fournit des énoncés étiquetés par locuteur ; Meeting Notes écrit les artefacts et le résumé.

## Installer et activer

Meeting Notes est un plugin source externe dans ce référentiel. Il ne fait pas partie du package OpenClaw npm principal et n'est disponible que lorsque le plugin est installé en tant que plugin ou chargé depuis une extraction source qui contient `extensions/meeting-notes`.

Une fois le plugin chargé, il est activé par défaut, sauf si l'un de ces paramètres le bloque :

- `plugins.enabled: false` désactive tous les plugins.
- `plugins.deny` contient `meeting-notes`.
- `plugins.allow` est défini et ne contient pas `meeting-notes`.
- `plugins.entries.meeting-notes.enabled: false` désactive cette entrée de plugin.
- `plugins.entries.meeting-notes.config.enabled: false` garde le plugin chargé
  mais désactive le `meeting_notes` tool et le service de démarrage automatique.

Le fichier de configuration utilisateur normal est `~/.openclaw/openclaw.json`. La section `plugins`
contrôle le chargement des plugins, et l'objet imbriqué `entries.<pluginId>.config`
est transmis à ce plugin en tant que configuration spécifique au plugin. Un bloc `config: { ... }`
séparé sous `meeting-notes` est attendu ; c'est ainsi que les plugins
reçoivent leurs propres options sans ajouter de clés de configuration principale.

Utilisez cette forme lorsque votre configuration possède une liste d'autorisation de plugins :

```json5
{
  plugins: {
    allow: ["discord", "meeting-notes"],
    entries: {
      "meeting-notes": {
        enabled: true,
        config: {
          enabled: true,
          maxUtterances: 2000,
          autoStart: [],
        },
      },
    },
  },
}
```

Exécutez une vérification de la configuration après édition :

```bash
openclaw config validate
```

Le rechargement à chaud de la configuration du Gateway applique les modifications de la liste d'autorisation des plugins et des entrées de plugins.
Redémarrez le Gateway si vous modifiez également le plugin source lui-même, si vous installez
de nouveaux fichiers de plugin, ou si vous modifiez les identifiants vocaux Discord.

## Configuration

Meeting Notes possède trois champs de configuration de plugin :

- `enabled` : `true` par défaut. Définissez `false` pour laisser le plugin installé mais
  désactiver le tool et le service de démarrage automatique.
- `maxUtterances` : `2000` par défaut. La génération de résumé lit uniquement les N
  énoncés les plus récents de `transcript.jsonl` ; les valeurs valides sont limitées à `1` à
  `10000`.
- `autoStart` : vide par défaut. Chaque entrée démarre une source de notes en direct lorsque le
  Gateway démarre ou recharge le plugin.

Une entrée `autoStart` accepte :

- `providerId` : requis. Utilisez `discord-voice` pour la voix Discord.
- `enabled` : optionnel, `true` par défaut. Définissez `false` pour conserver une entrée sans
  la démarrer.
- `sessionId` : optionnel. Si omis, OpenClaw génère un id horodaté.
- `title` : titre lisible par l'homme optionnel pour les résumés et la sortie CLI.
- `accountId` : identifiant du compte source optionnel lorsqu'il existe plus d'un compte.
- `guildId` : identifiant de guilde Discord spécifique au fournisseur.
- `channelId` : identifiant du canal vocal Discord spécifique au fournisseur.
- `meetingUrl` : URL de réunion spécifique au fournisseur pour les sources de navigateur ou de calendrier.

Utilisez `autoStart` lorsque OpenClaw doit commencer à capturer les notes automatiquement au démarrage de la passerelle :

```json5
{
  plugins: {
    entries: {
      "meeting-notes": {
        config: {
          autoStart: [
            {
              providerId: "discord-voice",
              guildId: "123",
              channelId: "456",
              title: "Weekly planning",
            },
          ],
        },
      },
    },
  },
}
```

Le démarrage automatique réessaie les échecs de démarrage jusqu'à 12 fois avec un délai de cinq secondes.
Cela permet au service de notes d'attendre que les plugins de canal tels que Discord terminent
leur initialisation. Les sessions qui ont été démarrées par le démarrage automatique sont arrêtées et résumées
lorsque le service de plugin s'arrête proprement.

La capture vocale Discord nécessite toujours la configuration et les autorisations vocales normales de Discord.
Voir [Discord voice](/fr/channels/discord#voice-mode).

## Voix Discord

Discord est la première source en direct. Le plugin Discord possède la connexion vocale,
la détection des intervenants, le décodage audio et la transcription. Meeting Notes reçoit
les énoncés finaux étiquetés par intervenant et les persiste.

Pour la capture en direct Discord :

- Activez et configurez d'abord le plugin Discord.
- Configurez le mode vocal Discord afin que OpenClaw puisse rejoindre le canal vocal cible.
- Utilisez `providerId: "discord-voice"`.
- Fournissez `guildId` et `channelId`.
- Ajoutez `accountId` uniquement lorsque vous exécutez plus d'un compte Discord.

Le modèle de transcription n'est pas choisi par Meeting Notes. Dans le mode Discord `stt-tts`, la STT utilise `tools.media.audio` ; `voice.model` contrôle le modèle de réponse de l'agent, et non la transcription. Dans les modes vocaux en temps réel, la transcription suit le fournisseur et le modèle en temps réel configurés. Consultez [Discord voice](/fr/channels/discord#voice-mode) pour les paramètres actuels du modèle et du fournisseur Discord voice.

## Google Meet, regroupements Slack et autres sources

Meeting Notes est intentionnellement neutre vis-à-vis de la source. Google Meet, les regroupements Slack, Zoom, les enregistrements de calendrier ou la capture de sous-titres du navigateur doivent être des fournisseurs de sources distincts qui s'inscrivent auprès du SDK du plugin.

Choix de sources recommandés :

- Prise en charge en direct du navigateur/sous-titres Google Meet : implémentez un fournisseur `live-caption` qui accepte `meetingUrl` et émet les énoncés finaux des sous-titres.
- Enregistrements Google Meet ou transcriptions téléchargées : implémentez `posthoc-transcript` ou utilisez `manual-transcript` jusqu'à ce qu'un fournisseur existe.
- Regroupements Slack aujourd'hui : importez les notes ou les artefacts de transcription de regroupement après la réunion. Slack n'expose pas d'API générale permettant à un bot de rejoindre l'audio de regroupement en direct.
- Regroupements Slack plus tard : gardez le fournisseur de source propriétaire de Slack responsable de l'authentification Slack, de la recherche d'artefacts et de la normalisation des transcriptions.

Le moteur de notes ne doit pas contenir de jonctions de plateforme, d'automatisation de navigateur, d'interrogation de l'Slack API ou de logique vocale Discord. Celles-ci appartiennent au plugin source propriétaire.

## Outil

Utilisez `meeting_notes` avec un `action` :

- `status` : répertorie les fournisseurs enregistrés et les sessions actives.
- `start` : démarre une session de notes en direct.
- `stop` : arrête une session en direct et écrit `summary.md`.
- `import` : importer une transcription et écrire `summary.md`.
- `summarize` : régénérer un résumé pour une session existante.

Les notes en direct Discord nécessitent `providerId: "discord-voice"`, ainsi que `guildId` et `channelId`. `accountId` est facultatif lorsqu'un seul compte Discord est actif.

```json
{
  "action": "start",
  "providerId": "discord-voice",
  "guildId": "123",
  "channelId": "456",
  "title": "Weekly planning"
}
```

Arrêter par id de session :

```json
{
  "action": "stop",
  "sessionId": "meeting-2026-05-22T10-00-00-000Z-a1b2c3d4"
}
```

Importer une transcription :

```json
{
  "action": "import",
  "providerId": "manual-transcript",
  "title": "Design review",
  "transcript": "Alex: We decided to ship the Discord source first.\nSam: Action item: add Slack huddle import later."
}
```

`manual-transcript` divise le texte de transcription brut en énoncés. Utilisez-le pour les notes Slack copiées, les résumés de Slack huddle, les transcriptions de calendrier, ou toute source ayant déjà produit du texte.

## Structure de stockage

Les artefacts sont stockés dans le répertoire d'état OpenClaw :

```text
$OPENCLAW_STATE_DIR/meeting-notes/YYYY-MM-DD/<session>/
  metadata.json
  transcript.jsonl
  summary.json
  summary.md
```

Si `OPENCLAW_STATE_DIR` n'est pas défini, le répertoire d'état par défaut est `~/.openclaw`. Une installation locale normale écrit donc les notes sous `~/.openclaw/meeting-notes/...`.

Chaque fichier a une seule fonction :

- `metadata.json` : id de session, provider source, titre, heure de début, heure de fin et métadonnées du provider.
- `transcript.jsonl` : énoncés des intervenants en ajout uniquement. Chaque ligne est un objet JSON contenant le texte de l'énoncé et l'id de la session.
- `summary.json` : données de résumé structurées utilisées par les outils, y compris la fenêtre de transcription étiquetée par intervenant utilisée pour le résumé généré.
- `summary.md` : notes lisibles par l'humain pour les terminaux, les éditeurs et les flux de travail documentaires, incluant une section de transcription étiquetée par intervenant.

Le répertoire de date provient de l'heure de début de la session, donc plusieurs réunions par jour restent groupées. Si un id de session humain se répète sur plusieurs jours, utilisez le sélecteur qualifié par date de `openclaw meeting-notes list`, tel que `2026-05-22/standup`.

Par défaut, OpenClaw génère des id de session horodatés :

```text
meeting-2026-05-22T10-00-00-000Z-a1b2c3d4
```

Cela signifie que dix réunions le même jour deviennent dix répertoires frères :

```text
~/.openclaw/meeting-notes/2026-05-22/
  meeting-2026-05-22T09-00-00-000Z-a1b2c3d4/
  meeting-2026-05-22T10-30-00-000Z-b2c3d4e5/
  meeting-2026-05-22T13-00-00-000Z-c3d4e5f6/
```

Configurez `sessionId` uniquement lorsque cet identifiant est unique pour la journée. Les identifiants humains tels que `standup` conviennent pour une réunion récurrente par jour. Si le même identifiant apparaît plusieurs jours, utilisez le sélecteur qualifié par date dans le CLI.

## Accès CLI

Utilisez le CLI en lecture seule pour trouver ou imprimer les résumés stockés :

```bash
openclaw meeting-notes list
openclaw meeting-notes show <session>
openclaw meeting-notes path <session>
openclaw meeting-notes path <session> --transcript
```

Consultez [Meeting Notes CLI](/fr/cli/meeting-notes) pour la référence complète des commandes.

## Longues réunions

Pour les longues réunions, les énoncés sont ajoutés à `transcript.jsonl` au fur et à mesure de leur arrivée.
La génération de résumé lit une fenêtre limitée contrôlée par `plugins.entries.meeting-notes.config.maxUtterances` (par défaut : `2000`), de sorte qu'un appel de plusieurs heures ne nécessite pas une mémoire de résumé illimitée.

Cela signifie que la transcription peut continuer à croître sur le disque, tandis que le résumé reste limité. Augmentez `maxUtterances` lorsque vous avez besoin de plus de contenu d'une réunion de plusieurs heures dans le résumé généré et la section de transcription étiquetée par l'orateur. Diminuez-le lorsque les résumés sont trop lents ou trop volumineux.

Les résumés actuels sont générés lorsqu'une session s'arrête, après un import, ou lorsque l'action `summarize` s'exécute. Ils ne sont pas réécrits en continu pour chaque énoncé.

## Dépannage

### `meeting_notes` est manquant

Vérifiez que le plugin est installé ou chargé à partir de la source, et que le chargement du plugin ne l'exclut pas :

```bash
openclaw config validate
openclaw meeting-notes list
```

Si `plugins.allow` est défini, il doit inclure `meeting-notes`. Si `plugins.deny`
contient `meeting-notes`, supprimez-le.

### Le démarrage automatique ne rejoint pas Discord

Confirmez que l'entrée `autoStart` utilise `providerId: "discord-voice"` et inclut
à la fois `guildId` et `channelId`. Si vous utilisez plusieurs comptes Discord, incluez
`accountId`. Vérifiez également que la voix Discord fonctionne en dehors de Meeting Notes en rejoignant
le même canal vocal via les commandes vocales Discord.

### Le résumé est manquant

Les sessions en direct écrivent `summary.md` lorsqu'elles sont arrêtées. Arrêtez la session avec l'action `meeting_notes` `stop`, puis inspectez-la :

```bash
openclaw meeting-notes list
openclaw meeting-notes path <session>
```

Utilisez l'action `meeting_notes` `summarize` pour régénérer `summary.md` pour une session stockée existante.

### Le sélecteur est ambigu

Si vous avez réutilisé un identifiant de session humain tel que `standup`, utilisez le sélecteur qualifié par date affiché par `openclaw meeting-notes list` :

```bash
openclaw meeting-notes show 2026-05-22/standup
```

## Connexes

- [CLI Meeting Notes](/fr/cli/meeting-notes)
- [Voix Discord](/fr/channels/discord#voice-mode)
- [Gestion des plugins](/fr/tools/plugin)
- [Architecture des plugins](/fr/plugins/architecture)
