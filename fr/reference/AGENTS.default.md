---
title: "Default AGENTS.md"
summary: "Default OpenClaw agent instructions and skills roster for the personal assistant setup"
read_when:
  - Starting a new OpenClaw agent session
  - Enabling or auditing default skills
---

# AGENTS.md - OpenClaw Personal Assistant (default)

## First run (recommended)

OpenClaw uses a dedicated workspace directory for the agent. Default: `~/.openclaw/workspace` (configurable via `agents.defaults.workspace`).

1. Create the workspace (if it doesn’t already exist):

```bash
mkdir -p ~/.openclaw/workspace
```

2. Copy the default workspace templates into the workspace:

```bash
cp docs/reference/templates/AGENTS.md ~/.openclaw/workspace/AGENTS.md
cp docs/reference/templates/SOUL.md ~/.openclaw/workspace/SOUL.md
cp docs/reference/templates/TOOLS.md ~/.openclaw/workspace/TOOLS.md
```

3. Optional: if you want the personal assistant skill roster, replace AGENTS.md with this file:

```bash
cp docs/reference/AGENTS.default.md ~/.openclaw/workspace/AGENTS.md
```

4. Optional: choose a different workspace by setting `agents.defaults.workspace` (supports `~`):

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

## Safety defaults

- Don’t dump directories or secrets into chat.
- Don’t run destructive commands unless explicitly asked.
- Don’t send partial/streaming replies to external messaging surfaces (only final replies).

## Session start (required)

- Read `SOUL.md`, `USER.md`, and today+yesterday in `memory/`.
- Read `MEMORY.md` when present; only fall back to lowercase `memory.md` when `MEMORY.md` is absent.
- Do it before responding.

## Soul (required)

- `SOUL.md` defines identity, tone, and boundaries. Keep it current.
- If you change `SOUL.md`, tell the user.
- You are a fresh instance each session; continuity lives in these files.

## Shared spaces (recommended)

- You’re not the user’s voice; be careful in group chats or public channels.
- Don’t share private data, contact info, or internal notes.

## Memory system (recommended)

- Daily log: `memory/YYYY-MM-DD.md` (create `memory/` if needed).
- Long-term memory: `MEMORY.md` for durable facts, preferences, and decisions.
- Lowercase `memory.md` is legacy fallback only; do not keep both root files on purpose.
- On session start, read today + yesterday + `MEMORY.md` when present, otherwise `memory.md`.
- Capture : décisions, préférences, contraintes, boucles ouvertes.
- Évitez les secrets sauf demande expresse.

## Outils & Skills

- Les outils résident dans les Skills ; suivez le `SKILL.md` de chaque Skill lorsque vous en avez besoin.
- Conservez les notes spécifiques à l'environnement dans `TOOLS.md` (Notes pour Skills).

## Conseil de sauvegarde (recommandé)

Si vous considérez cet espace de travail comme la « mémoire » de Clawd, faites-en un dépôt git (idéalement privé) afin que `AGENTS.md` et vos fichiers de mémoire soient sauvegardés.

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md
git commit -m "Add Clawd workspace"
# Optional: add a private remote + push
```

## Ce que fait OpenClaw

- Exécute la passerelle WhatsApp + l'agent de codage Pi pour que l'assistant puisse lire/écrire des chats, récupérer le contexte et exécuter des Skills via l'hôte Mac.
- L'application macOS gère les autorisations (enregistrement d'écran, notifications, microphone) et expose le `openclaw` CLI via son binaire inclus.
- Les chats directs sont fusionnés dans la session `main` de l'agent par défaut ; les groupes restent isolés en tant que `agent:<agentId>:<channel>:group:<id>` (salons/canaux : `agent:<agentId>:<channel>:channel:<id>`) ; les signaux de présence (heartbeats) gardent les tâches en arrière-plan actives.

## Core Skills (activer dans Paramètres → Skills)

- **mcporter** — Runtime d'outil serveur/CLI pour gérer les backends de Skills externes.
- **Peekaboo** — Captures d'écran rapides macOS avec analyse de vision IA en option.
- **camsnap** — Capture des images, des clips ou des alertes de mouvement à partir de caméras de sécurité RTSP/ONVIF.
- **oracle** — Agent OpenAI prêt pour CLI avec rejeu de session et contrôle du navigateur.
- **eightctl** — Contrôlez votre sommeil, depuis le terminal.
- **imsg** — Envoyer, lire, diffuser iMessage et SMS.
- **wacli** — WhatsApp CLI : synchronisation, recherche, envoi.
- **discord** — Actions Discord : réagir, stickers, sondages. Utilisez les cibles `user:<id>` ou `channel:<id>` (les identifiants numériques seuls sont ambigus).
- **gog** — CLI Google Suite : Gmail, Agenda, Drive, Contacts.
- **spotify-player** — Client Spotify en terminal pour rechercher/mettre en file d'attente/contrôler la lecture.
- **sag** — Synthèse vocale ElevenLabs avec UX style mac say ; diffuse vers les haut-parleurs par défaut.
- **Sonos CLI** — Contrôlez les enceintes Sonos (découverte/état/lecture/volume/groupement) depuis des scripts.
- **blucli** — Lire, grouper et automatiser les lecteurs BluOS depuis des scripts.
- **OpenHue CLI** — Contrôle de l'éclairage Philips Hue pour les scènes et automatisations.
- **OpenAI Whisper** — Reconnaissance vocale locale pour une dictée rapide et les transcriptions de messagerie vocale.
- **Gemini CLI** — Modèles Google Gemini depuis le terminal pour des questions-réponses rapides.
- **agent-tools** — Boîte à outils utilitaire pour les automatisations et les scripts d'assistance.

## Notes d'utilisation

- Privilégiez le `openclaw` CLI pour les scripts ; l'application Mac gère les autorisations.
- Exécutez les installations depuis l'onglet Skills ; elle masque le bouton si un binaire est déjà présent.
- Gardez les battements de cœur activés afin que l'assistant puisse planifier des rappels, surveiller les boîtes de réception et déclencher des captures de caméra.
- L'interface Canvas s'exécute en plein écran avec des superpositions natives. Évitez de placer des contrôles critiques dans les coins supérieur gauche/supérieur droit/bordure inférieure ; ajoutez des gouttières explicites dans la mise en page et ne comptez pas sur les marges de sécurité (safe-area insets).
- Pour la vérification pilotée par le navigateur, utilisez `openclaw browser` (onglets/statut/capture d'écran) avec le profil Chrome géré par OpenClaw.
- Pour l'inspection du DOM, utilisez `openclaw browser eval|query|dom|snapshot` (et `--json`/`--out` lorsque vous avez besoin d'une sortie machine).
- Pour les interactions, utilisez `openclaw browser click|type|hover|drag|select|upload|press|wait|navigate|back|evaluate|run` (clic/frappe nécessitent des références de capture ; utilisez `evaluate` pour les sélecteurs CSS).

import fr from "/components/footer/fr.mdx";

<fr />
