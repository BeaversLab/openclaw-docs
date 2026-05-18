---
summary: "Scénarios locaux du canal QA pour les vérifications des flux de travail des assistants personnels préservant la confidentialité."
read_when:
  - Running local personal agent reliability checks
  - Extending the repo-backed QA scenario catalog
  - Verifying reminder, reply, memory, redaction, and safe tool followthrough behavior
title: "Pack de référence pour agents personnels"
---

Le Personal Agent Benchmark Pack est un petit pack de scénarios QA reposant sur un dépôt, destiné aux flux de travail d'assistants personnels locaux. Ce n'est pas une référence de modèle générique et il ne nécessite pas de nouveau lanceur. Le pack réutilise la pile QA privée décrite dans [Aperçu QA](/fr/concepts/qa-e2e-automation), le [canal QA](/fr/channels/qa-channel) synthétique, et le catalogue markdown `qa/scenarios` existant.

Le premier pack est volontairement restreint :

- faux rappels personnels via la livraison cron locale
- faux acheminements de réponses DM et de fils de discussion via `qa-channel`
- faux rappels de préférences à partir des fichiers mémoire temporaires de l'espace de travail QA
- fausses vérifications de non-écho de secrets
- suivi d'outil sécurisé basé sur la lecture après un court tour de type approbation

## Scénarios

Les métadonnées lisibles par machine du pack se trouvent dans `extensions/qa-lab/src/scenario-packs.ts`. Exécutez le pack avec `--pack personal-agent` :

```bash
OPENCLAW_ENABLE_PRIVATE_QA_CLI=1 pnpm openclaw qa suite \
  --provider-mode mock-openai \
  --pack personal-agent \
  --concurrency 1
```

`--pack` est additif avec les drapeaux `--scenario` répétés. Les scénarios explicites s'exécutent en premier, puis les scénarios du pack s'exécutent dans l'ordre `QA_PERSONAL_AGENT_SCENARIO_IDS` sans les doublons.

Le pack est conçu pour `qa-channel` avec `mock-openai` ou une autre voie de fournisseur QA local. Il ne doit pas être dirigé vers des services de chat en direct ou de vrais comptes personnels.

## Modèle de confidentialité

Les scénarios utilisent uniquement de faux utilisateurs, de fausses préférences, de faux secrets et l'espace de travail de passerelle QA temporaire créé par la suite. Ils ne doivent ni lire ni écrire la mémoire utilisateur réelle OpenClaw, les sessions, les identifiants, les agents de lancement, les configurations globales ou l'état de la passerelle en direct.

Les artefacts restent dans le répertoire d'artefacts de la suite QA existante et doivent être traités comme une sortie de test. Les vérifications de rédaction utilisent de faux marqueurs, ce qui permet d'inspecter et de signaler les échecs en toute sécurité.

## Extension du pack

Ajoutez de nouveaux cas sous `qa/scenarios/personal/`, puis ajoutez l'identifiant du scénario à `QA_PERSONAL_AGENT_SCENARIO_IDS`. Gardez chaque cas petit, local, déterministe dans `mock-openai`, et axé sur un comportement d'assistant personnel.

Bons candidats pour le suivi :

- exactitude du refus d'approbation
- assertions du grand livre de tâches en plusieurs étapes
- vérifications de l'exportation de trajectoire expurgée
- vérifications du flux de travail des plugins en local uniquement

Évitez d'ajouter un nouveau runner, plugin, dépendance, transport en direct ou juge de modèle tant que le catalogue de scénarios ne dispose pas d'un nombre suffisant de cas stables pour justifier cette surface.
