---
summary: "Instructions par défaut de l'agent OpenClaw et liste des compétences pour la configuration de l'assistant personnel"
title: "AGENTS.md par défaut"
read_when:
  - Starting a new OpenClaw agent session
  - Enabling or auditing default skills
---

## Première exécution (recommandé)

OpenClaw utilise un répertoire de travail dédié pour l'agent. Par défaut : OpenClaw`~/.openclaw/workspace` (configurable via `agents.defaults.workspace`).

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

3. Optionnel : si vous souhaitez la liste de compétences d'assistant personnel, remplacez AGENTS.md par ce fichier :

```bash
cp docs/reference/AGENTS.default.md ~/.openclaw/workspace/AGENTS.md
```

4. Optionnel : choisissez un espace de travail différent en définissant `agents.defaults.workspace` (prend en charge `~`) :

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

## Paramètres de sécurité par défaut

- Ne déversez pas de répertoires ou de secrets dans le chat.
- N'exécutez pas de commandes destructrices sauf si cela est explicitement demandé.
- Avant de modifier la configuration ou les planificateurs (par exemple crontab, unités systemd, configurations nginx ou fichiers rc du shell), inspectez d'abord l'état existant et préservez/fusionnez par défaut.
- N'envoyez pas de réponses partielles ou en continu vers les surfaces de messagerie externes (uniquement les réponses finales).

## Début de session (requis)

- Lisez `SOUL.md`, `USER.md`, et aujourd'hui+hier dans `memory/`.
- Lisez `MEMORY.md` si présent.
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
- La version en minuscule `memory.md` est une entrée de réparation d'ancienne génération uniquement ; ne gardez pas les deux fichiers racine exprès.
- Au début de la session, lisez aujourd'hui + hier + `MEMORY.md` si présent.
- Avant d'écrire des fichiers de mémoire, lisez-les d'abord ; n'écrivez que des mises à jour concrètes, jamais des espaces réservés vides.
- Capturez : décisions, préférences, contraintes, boucles ouvertes.
- Évitez les secrets sauf demande explicite.

## Outils et Skills

- Les outils vivent dans les Skills ; suivez chaque `SKILL.md` de la skill lorsque vous en avez besoin.
- Gardez les notes spécifiques à l'environnement dans `TOOLS.md` (Notes pour les Skills).

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

- Exécute la passerelle WhatsApp + l'agent OpenClaw intégré pour que l'assistant puisse lire/écrire des chats, récupérer du contexte et exécuter des compétences via l'hôte Mac.
- L'application macOS gère les autorisations (enregistrement d'écran, notifications, microphone) et expose le `openclaw` CLI via son binaire inclus.
- Les discussions directes sont réduites dans la session `main` de l'agent par défaut ; les groupes restent isolés en tant que `agent:<agentId>:<channel>:group:<id>` (salons/canaux : `agent:<agentId>:<channel>:channel:<id>`) ; les battements de cœur maintiennent les tâches d'arrière-plan en vie.

## Skills de base (à activer dans Paramètres → Skills)

- **mcporter** - Runtime d'exécution du serveur d'outils/CLI pour gérer les backends de Skills externes.
- **Peekaboo** - Captures d'écran rapides macOS avec analyse de vision IA en option.
- **camsnap** - Capture des images, des clips ou des alertes de mouvement à partir de caméras de sécurité RTSP/ONVIF.
- **oracle** - Agent OpenAI prêt pour CLI avec rejeu de session et contrôle du navigateur.
- **eightctl** - Contrôlez votre sommeil, depuis le terminal.
- **imsg** - Envoyez, lisez, diffusez iMessage et SMS.
- **wacli** - WhatsApp CLI : synchronisation, recherche, envoi.
- **discord** - Actions Discord : réagir, autocollants, sondages. Utilisez les cibles `user:<id>` ou `channel:<id>` (les identifiants numériques seuls sont ambigus).
- **gog** - CLI Google Suite : Gmail, Agenda, Drive, Contacts.
- **spotify-player** - Client Spotify terminal pour rechercher/mettre en file d'attente/contrôler la lecture.
- **sag** - Synthèse vocale ElevenLabs avec une UX de style « say » Mac ; diffuse vers les haut-parleurs par défaut.
- **Sonos CLI** - Contrôlez les haut-parleurs Sonos (découverte/état/lecture/volume/groupement) à partir de scripts.
- **blucli** - Lire, grouper et automatiser les lecteurs BluOS à partir de scripts.
- **OpenHue CLI** - Contrôle de l'éclairage Philips Hue pour les scènes et automatisations.
- **OpenAI Whisper** - Reconnaissance vocale locale pour une dictée rapide et les transcriptions de messagerie vocale.
- **Gemini CLI** - Modèles Google Gemini depuis le terminal pour un questions-réponses rapide.
- **agent-tools** - Boîte à outils utilitaire pour les automatisations et scripts d'assistance.

## Notes d'utilisation

- Privilégiez le `openclaw` CLI pour les scripts ; l'application Mac gère les autorisations.
- Lancez les installations depuis l'onglet Skills ; le bouton est masqué si un binaire est déjà présent.
- Gardez les battements de cœur (heartbeats) activés pour que l'assistant puisse planifier des rappels, surveiller les boîtes de réception et déclencher des captures de caméra.
- L'interface Canvas s'exécute en plein écran avec des superpositions natives. Évitez de placer des contrôles critiques sur les bords en haut à gauche, en haut à droite ou en bas ; ajoutez des gouttières explicites dans la mise en page et ne vous fiez pas aux zones de sécurité (safe-area insets).
- Pour la vérification par navigateur, utilisez `openclaw browser` (onglets/état/capture d'écran) avec le profil Chrome géré par OpenClaw.
- Pour l'inspection du DOM, utilisez `openclaw browser eval|query|dom|snapshot` (et `--json`/`--out` lorsque vous avez besoin d'une sortie machine).
- Pour les interactions, utilisez `openclaw browser click|type|hover|drag|select|upload|press|wait|navigate|back|evaluate|run` (cliquer/taper nécessitent des références de snapshot ; utilisez `evaluate` pour les sélecteurs CSS).

## Connexes

- [Espace de travail de l'agent](/fr/concepts/agent-workspace)
- [Runtime de l'agent](/fr/concepts/agent)
