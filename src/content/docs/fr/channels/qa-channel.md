---
summary: "Plugin de channel de classe Slack synthétique pour des scénarios QA OpenClaw déterministes"
title: "Channel QA"
read_when:
  - You are wiring the synthetic QA transport into a local or CI test run
  - You need the bundled qa-channel config surface
  - You are iterating on end-to-end QA automation
---

`qa-channel`OpenClaw est un transport de messages synthétique intégré pour les tests automatisés OpenClaw QA. Ce n'est pas un channel de production - il existe pour exercer la même limite de plugin de channel utilisée par les transports réels tout en gardant l'état déterministe et parfaitement inspectable.

## Ce qu'il fait

- Grammaire cible de classe Slack :
  - `dm:<user>`
  - `channel:<room>`
  - `group:<room>`
  - `thread:<room>/<thread>`
- Les conversations partagées `channel:` et `group:`DiscordSlackTelegram sont présentées aux agents comme des tours de salle de groupe/channel, ce qui leur permet d'exercer la même stratégie de routage de réponse visible et d'outil de message utilisée par Discord, Slack, Telegram et les transports similaires.
- Bus synthétique basé sur HTTP pour l'injection de messages entrants, la capture de transcriptions sortantes, la création de fils de discussion, les réactions, les modifications, les suppressions et les actions de recherche/lecture.
- Runner de vérification automatique côté hôte qui écrit un rapport Markdown dans `.artifacts/qa-e2e/`.

## Config

```json
{
  "channels": {
    "qa-channel": {
      "baseUrl": "http://127.0.0.1:43123",
      "botUserId": "openclaw",
      "botDisplayName": "OpenClaw QA",
      "allowFrom": ["*"],
      "pollTimeoutMs": 1000
    }
  }
}
```

Clés de compte :

- `enabled` - interrupteur principal pour ce compte.
- `name` - libellé d'affichage optionnel.
- `baseUrl` - URL du bus synthétique.
- `botUserId`Matrix - identifiant utilisateur bot de style Matrix utilisé dans la grammaire cible.
- `botDisplayName` - nom d'affichage pour les messages sortants.
- `pollTimeoutMs` - fenêtre d'attente de type long-poll. Entier entre 100 et 30000.
- `allowFrom` - liste blanche des expéditeurs (identifiants utilisateurs ou `"*"`). Les messages directs et
  la stratégie de groupe autorisée utilisent tous deux ces identifiants d'expéditeur synthétiques.
- `groupPolicy` - stratégie de salle partagée : `"open"` (par défaut), `"allowlist"` ou
  `"disabled"`.
- `groupAllowFrom` - liste blanche optionnelle des expéditeurs de salle partagée. Si omise sous
  `"allowlist"`, le QA Channel revient à `allowFrom`.
- `groups.<room>.requireMention` - nécessite une mention du bot avant de répondre dans une
  salle de groupe/channel spécifique. `groups."*"` définit la valeur par défaut.
- `defaultTo` - cible de repli si aucune n'est fournie.
- `actions.messages` / `actions.reactions` / `actions.search` / `actions.threads` - filtrage des outils par action.

Clés multi-comptes au niveau supérieur :

- `accounts` - enregistrement des remplacements nommés par compte, indexés par l'identifiant de compte.
- `defaultAccount` - identifiant de compte préféré lorsque plusieurs sont configurés.

## Runners

Auto-vérification côté hôte (écrit un rapport Markdown sous `.artifacts/qa-e2e/`) :

```bash
pnpm qa:e2e
```

Cela achemine via `qa-lab`, démarre le bus QA dans le dépôt, lance la tranche d'exécution `qa-channel` groupée et exécute une auto-vérification déterministe.

Suite de scénarios basée sur le dépôt complet :

```bash
pnpm openclaw qa suite
```

Exécute des scénarios en parallèle sur la passerelle QA. Consultez la [vue d'ensemble QA](/fr/concepts/qa-e2e-automation) pour les scénarios, les profils et les modes de provider.

Site QA Docker (passerelle + interface du débogueur QA Lab dans une même stack) :

```bash
pnpm qa:lab:up
```

Construit le site QA, démarre la stack passerelle + QA Lab Docker et imprime l'URL du QA Lab. À partir de là, vous pouvez choisir des scénarios, sélectionner la voie de model, lancer des exécutions individuelles et regarder les résultats en direct. Le débogueur QA Lab est distinct du bundle d'interface de contrôle expédié.

## Connexes

- [Vue d'ensemble QA](/fr/concepts/qa-e2e-automation) - stack globale, adaptateurs de transport, rédaction de scénarios
- [QA Matrix](/fr/concepts/qa-matrix) - exemple de runner de transport en direct qui pilote un channel réel
- [Appairage](/fr/channels/pairing)
- [Groupes](/fr/channels/groups)
- [Vue d'ensemble des channels](/fr/channels)
