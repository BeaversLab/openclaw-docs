---
title: "AGENTS.md par défaut"
summary: "Instructions de l'agent OpenClaw par défaut et liste des compétences pour la configuration de l'assistant personnel"
read_when:
  - Starting a new OpenClaw agent session
  - Enabling or auditing default skills
---

# AGENTS.md - OpenClaw Assistant personnel (par défaut)

## Première exécution (recommandé)

OpenClaw utilise un répertoire de travail dédié pour l'agent. Par défaut : `~/.openclaw/workspace` (configurable via `agents.defaults.workspace`).

1. Créez l'espace de travail (s'il n'existe pas déjà) :

```bash
mkdir -p ~/.openclaw/workspace
```

2. Copiez les modèles d'espace de travail par défaut dans l'espace de travail :

```bash
cp docs/reference/templates/AGENTS.md ~/.openclaw/workspace/AGENTS.md
cp docs/reference/templates/SOUL.md ~/.openclaw/workspace/SOUL.md
cp docs/reference/templates/TOOLS.md ~/.openclaw/workspace/TOOLS.md
```

3. Optionnel : si vous souhaitez la liste des compétences de l'assistant personnel, remplacez AGENTS.md par ce fichier :

```bash
cp docs/reference/AGENTS.default.md ~/.openclaw/workspace/AGENTS.md
```

4. Optionnel : choisissez un autre espace de travail en définissant `agents.defaults.workspace` (prend en charge `~`) :

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

## Paramètres de sécurité par défaut

- Ne déversez pas de répertoires ou de secrets dans le chat.
- N'exécutez pas de commandes destructrices sauf demande explicite.
- N'envoyez pas de réponses partielles/en continu vers des surfaces de messagerie externes (uniquement les réponses finales).

## Début de session (requis)

- Lisez `SOUL.md`, `USER.md`, et aujourd'hui+hier dans `memory/`.
- Lisez `MEMORY.md` lorsqu'il est présent ; n'utilisez `memory.md` en minuscules qu'en cas d'absence de `MEMORY.md`.
- Faites-le avant de répondre.

## Âme (requis)

- `SOUL.md` définit l'identité, le ton et les limites. Tenez-le à jour.
- Si vous modifiez `SOUL.md`, informez l'utilisateur.
- Vous êtes une nouvelle instance à chaque session ; la continuité réside dans ces fichiers.

## Espaces partagés (recommandé)

- Vous n'êtes pas la voix de l'utilisateur ; soyez prudent dans les discussions de groupe ou les canaux publics.
- Ne partagez pas de données privées, de coordonnées ou de notes internes.

## Système de mémoire (recommandé)

- Journal quotidien : `memory/YYYY-MM-DD.md` (créez `memory/` si nécessaire).
- Mémoire à long terme : `MEMORY.md` pour les faits durables, les préférences et les décisions.
- La version en minuscule `memory.md` n'est qu'une solution de repli héritée ; ne gardez pas les deux fichiers racine exprès.
- Au début de la session, lisez aujourd'hui + hier + `MEMORY.md` si présent, sinon `memory.md`.
- Capturez : les décisions, les préférences, les contraintes, les tâches en cours.
- Évitez les secrets sauf demande explicite.

## Outils et compétences

- Les outils résident dans les compétences ; suivez le `SKILL.md` de chaque compétence lorsque vous en avez besoin.
- Conservez les notes spécifiques à l'environnement dans `TOOLS.md` (Notes pour les compétences).

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

- Exécute la passerelle WhatsApp et l'agent de codage Pi pour que l'assistant puisse lire/écrire des discussions, récupérer le contexte et exécuter des compétences via l'hôte Mac.
- L'application macOS gère les autorisations (enregistrement d'écran, notifications, microphone) et expose la `openclaw` CLI via son binaire intégré.
- Les discussions directes sont fusionnées dans la session `main` de l'agent par défaut ; les groupes restent isolés en tant que `agent:<agentId>:<channel>:group:<id>` (salons/canaux : `agent:<agentId>:<channel>:channel:<id>`) ; les battements de cœur maintiennent les tâches d'arrière-plan en vie.

## Compétences principales (activer dans Paramètres → Compétences)

- **mcporter** — Runtime serveur d'outils/CLI pour gérer les backends de compétences externes.
- **Peekaboo** — Captures d'écran rapides sur macOS avec analyse visuelle par IA en option.
- **camsnap** — Capture des images, des clips ou des alertes de mouvement à partir de caméras de sécurité RTSP/ONVIF.
- **oracle** — Agent OpenAI prêt pour CLI avec relecture de session et contrôle du navigateur.
- **eightctl** — Contrôlez votre sommeil, depuis le terminal.
- **imsg** — Envoyer, lire, diffuser iMessage et SMS.
- **wacli** — WhatsApp CLI : synchroniser, rechercher, envoyer.
- **discord** — Actions Discord : réagir, stickers, sondages. Utilisez les cibles `user:<id>` ou `channel:<id>` (les identifiants numériques seuls sont ambigus).
- **gog** — CLI Google Suite : Gmail, Agenda, Drive, Contacts.
- **spotify-player** — Client Spotify en terminal pour rechercher/mettre en file d'attente/contrôler la lecture.
- **sag** — Synthèse vocale ElevenLabs avec UX de style mac « say » ; diffuse vers les haut-parleurs par défaut.
- **Sonos CLI** — Contrôlez les enceintes Sonos (découverte/état/lecture/volume/groupement) depuis des scripts.
- **blucli** — Lire, grouper et automatiser les lecteurs BluOS depuis des scripts.
- **OpenHue CLI** — Contrôle de l'éclairage Philips Hue pour les scènes et automatisations.
- **OpenAI Whisper** — Reconnaissance vocale locale pour une dictée rapide et des transcriptions de messagerie vocale.
- **Gemini CLI** — Modèles Google Gemini depuis le terminal pour un Q&A rapide.
- **agent-tools** — Boîte à outils utilitaire pour les automatisations et scripts d'aide.

## Notes d'utilisation

- Privilégiez le CLI `openclaw` pour les scripts ; l'application mac gère les autorisations.
- Lancez les installations depuis l'onglet Skills ; il masque le bouton si un binaire est déjà présent.
- Gardez les battements de cœur (heartbeats) activés pour que l'assistant puisse planifier des rappels, surveiller les boîtes de réception et déclencher des captures de caméra.
- L'interface utilisateur Canvas s'exécute en plein écran avec des superpositions natives. Évitez de placer des contrôles critiques sur les bords haut-gauche/haut-droit/bas ; ajoutez des gouttières explicites dans la mise en page et ne comptez pas sur les marges de sécurité.
- Pour la vérification pilotée par navigateur, utilisez `openclaw browser` (onglets/état/capture d'écran) avec le profil Chrome géré par OpenClaw.
- Pour l'inspection du DOM, utilisez `openclaw browser eval|query|dom|snapshot` (et `--json`/`--out` lorsque vous avez besoin d'une sortie machine).
- Pour les interactions, utilisez `openclaw browser click|type|hover|drag|select|upload|press|wait|navigate|back|evaluate|run` (clic/tape nécessitent des références d'instantané ; utilisez `evaluate` pour les sélecteurs CSS).

import fr from "/components/footer/fr.mdx";

<fr />
