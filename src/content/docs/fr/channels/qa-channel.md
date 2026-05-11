---
summary: "Plugin de channel de classe Slack synthétique pour des scénarios QA OpenClaw déterministes"
title: "Channel QA"
read_when:
  - You are wiring the synthetic QA transport into a local or CI test run
  - You need the bundled qa-channel config surface
  - You are iterating on end-to-end QA automation
---

`qa-channel` est un transport de messages synthétique intégré pour le QA automatisé OpenClaw. Ce n'est pas un channel de production — il existe pour exercer la même limite du plugin de channel utilisée par les transports réels tout en gardant l'état déterministe et entièrement inspectable.

## Ce qu'il fait

- Grammaire cible de classe Slack :
  - `dm:<user>`
  - `channel:<room>`
  - `thread:<room>/<thread>`
- Bus synthétique soutenu par HTTP pour l'injection de messages entrants, la capture de transcripts sortants, la création de fils de discussion, les réactions, les modifications, les suppressions et les actions de recherche/lecture.
- Runner de self-check côté hôte qui écrit un rapport Markdown dans `.artifacts/qa-e2e/`.

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

- `enabled` — interrupteur maître pour ce compte.
- `name` — étiquette d'affichage facultative.
- `baseUrl` — URL du bus synthétique.
- `botUserId` — id d'utilisateur bot de style Matrix utilisé dans la grammaire cible.
- `botDisplayName` — nom d'affichage pour les messages sortants.
- `pollTimeoutMs` — fenêtre d'attente de long-poll. Entier entre 100 et 30000.
- `allowFrom` — liste d'autorisation des expéditeurs (ids utilisateur ou `"*"`).
- `defaultTo` — cible de repli lorsqu'aucune n'est fournie.
- `actions.messages` / `actions.reactions` / `actions.search` / `actions.threads` — limitation des outils par action.

Clés multi-compte au niveau supérieur :

- `accounts` — enregistrement des substitutions nommées par compte indexées par id de compte.
- `defaultAccount` — id de compte préféré lorsque plusieurs sont configurés.

## Runners

Self-check côté hôte (écrit un rapport Markdown sous `.artifacts/qa-e2e/`) :

```bash
pnpm qa:e2e
```

Cela passe par `qa-lab`, démarre le bus QA dans le dépôt, lance la partie d'exécution intégrée `qa-channel` et exécute une self-check déterministe.

Suite complète de scénarios basés sur le dépôt :

```bash
pnpm openclaw qa suite
```

Exécute des scénarios en parallèle sur la voie de passerelle QA. Consultez la [Vue d'ensemble QA](/fr/concepts/qa-e2e-automation) pour les scénarios, les profils et les modes de fournisseur.

Site QA soutenu par Docker (passerelle + interface utilisateur du débogueur QA Lab dans une seule pile) :

```bash
pnpm qa:lab:up
```

Construit le site QA, démarre la passerelle soutenue par Docker + la pile QA Lab, et imprime l'URL du QA Lab. À partir de là, vous pouvez choisir des scénarios, sélectionner la voie du modèle, lancer des exécutions individuelles et regarder les résultats en direct. Le débogueur QA Lab est distinct du bundle de l'interface utilisateur de contrôle expédié.

## Connexes

- [Vue d'ensemble QA](/fr/concepts/qa-e2e-automation) — pile globale, adaptateurs de transport, création de scénarios
- [Matrix QA](/fr/concepts/qa-matrix) — exemple de runner de transport en direct qui pilote un canal réel
- [Jumelage](/fr/channels/pairing)
- [Groupes](/fr/channels/groups)
- [Vue d'ensemble des canaux](/fr/channels)
