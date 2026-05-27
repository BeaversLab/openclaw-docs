---
summary: "Scénarios locaux du canal QA pour les vérifications des flux de travail des assistants personnels préservant la confidentialité."
read_when:
  - Running local personal agent reliability checks
  - Extending the repo-backed QA scenario catalog
  - Verifying reminder, reply, memory, redaction, safe tool followthrough, task status, share-safe diagnostics, proof-backed completion claims, and failure recovery
title: "Pack de référence pour agents personnels"
---

Le Personal Agent Benchmark Pack est un petit pack de scénarios QA reposant sur un dépôt, destiné aux flux de travail d'assistants personnels locaux. Ce n'est pas une référence de modèle générique et il ne nécessite pas de nouveau lanceur. Le pack réutilise la pile QA privée décrite dans [Aperçu QA](/fr/concepts/qa-e2e-automation), le [canal QA](/fr/channels/qa-channel) synthétique, et le catalogue markdown `qa/scenarios` existant.

Le premier pack est volontairement restreint :

- faux rappels personnels via la livraison cron locale
- faux acheminements de réponses DM et de fils de discussion via `qa-channel`
- faux rappels de préférences à partir des fichiers mémoire temporaires de l'espace de travail QA
- fausses vérifications de non-écho de secrets
- suivi d'outil sécurisé basé sur la lecture après un court tour de type approbation
- comportement d'arrêt en cas de refus d'approbation pour une demande de lecture locale sensible
- rapport d'état des tâches basé sur des preuves qui garde distincts les états en attente, bloqués et terminés
- artefacts de diagnostic sûrs pour le partage qui conservent un statut utile en omettant le contenu personnel brut
- revendications d'achèvement étayées par des preuves qui évitent les faux progrès avant l'existence de preuves locales
- la récupération sur échec qui signale un état partiel et garde les limites de nouvelle tentative claires

## Scénarios

Les métadonnées lisibles par machine du pack résident dans
`extensions/qa-lab/src/scenario-packs.ts``--pack personal-agent`. Exécutez le pack avec
%%PH:INLINE_CODE:9:7b0oca1c%% :

```bash
OPENCLAW_ENABLE_PRIVATE_QA_CLI=1 pnpm openclaw qa suite \
  --provider-mode mock-openai \
  --pack personal-agent \
  --concurrency 1
```

`--pack` s'ajoute avec des drapeaux `--scenario` répétés. Les scénarios explicites s'exécutent
en premier, puis les scénarios du pack s'exécutent dans l'ordre `QA_PERSONAL_AGENT_SCENARIO_IDS` avec
les doublons supprimés.

Le pack est conçu pour `qa-channel` avec `mock-openai` ou une autre voie de
fournisseur QA locale. Il ne doit pas être dirigé vers des services de chat en direct ou de vrais
comptes personnels.

## Modèle de confidentialité

Les scénarios utilisent uniquement de faux utilisateurs, de fausses préférences, de faux secrets et l'espace de travail
de passerelle QA temporaire créé par la suite. Ils ne doivent pas lire ou écrire
dans la mémoire utilisateur réelle d'OpenClaw, les sessions, les identifiants, les agents de lancement, les configurations globales
ou l'état de la passerelle en direct.

Les artefacts restent dans le répertoire des artefacts de la suite QA existante et doivent être
traités comme une sortie de test. Les vérifications de rédaction utilisent de faux marqueurs, de sorte que les échecs sont sûrs
à inspecter et à signaler dans les tickets.

## Extension du pack

Ajoutez de nouveaux cas sous `qa/scenarios/personal/`, puis ajoutez l'identifiant du scénario à
`QA_PERSONAL_AGENT_SCENARIO_IDS`. Gardez chaque cas petit, local, déterministe dans
`mock-openai`, et axé sur un seul comportement d'assistant personnel.

Bons candidats pour la suite :

- vérifications de l'export de trajectoire rédigée
- vérifications du workflow de plugin local uniquement

Évitez d'ajouter un nouveau lanceur, plugin, dépendance, transport en direct ou juge de modèle
jusqu'à ce que le catalogue de scénarios dispose de suffisamment de cas stables pour justifier cette surface.
