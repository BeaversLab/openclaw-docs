---
title: "OpenProseOpenProse"
sidebarTitle: "OpenProseOpenProse"
summary: "OpenProseOpenClawOpenProse est un format de workflow basé sur le markdown pour les sessions IA multi-agents. Dans OpenClaw, il est fourni sous forme de plugin avec une commande slash /prose et un pack de compétences."
read_when:
  - You want to run or write .prose workflow files
  - You want to enable the OpenProse plugin
  - You need to understand how OpenProse maps to OpenClaw primitives
---

OpenProse est un format de workflow portable, basé sur le markdown, pour orchestrer des sessions
IA. Dans OpenClaw, il est fourni sous forme de plugin qui installe un pack de
compétences OpenProse et une commande OpenProseOpenClawOpenProse`/prose` slash. Les programmes résident dans des fichiers `.prose` et peuvent
générer plusieurs sous-agents avec un flux de contrôle explicite.

<CardGroup cols={3}>
  <Card title="Install" icon="download" href="#install" OpenProseGateway>
    Activez le plugin OpenProse et redémarrez la Gateway.
  </Card>
  <Card title="Run a program" icon="play" href="#slash-command">
    Utilisez `/prose run` pour exécuter un fichier `.prose` ou un programme distant.
  </Card>
  <Card title="Write programs" icon="pencil" href="#example">
    Créez des workflows multi-agents avec des étapes parallèles et séquentielles.
  </Card>
</CardGroup>

## Install

<Steps>
  <Step title="Enable the plugin"OpenProse>
    Les plugins groupés sont désactivés par défaut. Activez OpenProse :

    ```bash
    openclaw plugins enable open-prose
    ```

  </Step>
  <Step title="GatewayRestart the Gateway">
    ```bash
    openclaw gateway restart
    ```
  </Step>
  <Step title="Verify">
    ```bash
    openclaw plugins list | grep prose
    ```

    Vous devriez voir `open-prose` comme activé. La commande de compétence `/prose` est désormais
    disponible dans le chat.

  </Step>
</Steps>

Pour une copie locale : `openclaw plugins install ./path/to/local/open-prose-plugin`

## Commande slash

OpenProse enregistre OpenProse`/prose` en tant que commande de compétence invoquable par l'utilisateur :

```text
/prose help
/prose run <file.prose>
/prose run <handle/slug>
/prose run <https://example.com/file.prose>
/prose compile <file.prose>
/prose examples
/prose update
```

`/prose run <handle/slug>` correspond à `https://p.prose.md/<handle>/<slug>`.
Les URL directes sont récupérées telles quelles à l'aide de l'outil `web_fetch`.

## Ce qu'il peut faire

- Recherche et synthèse multi-agents avec un parallélisme explicite.
- Workflows reproductibles et sûrs en matière d'approbation (revue de code, triage d'incidents, pipelines de contenu).
- Programmes `.prose` réutilisables que vous pouvez exécuter sur différents runtimes d'agents pris en charge.

## Exemple : recherche et synthèse parallèles

```prose
# Research + synthesis with two agents running in parallel.

input topic: "What should we research?"

agent researcher:
  model: sonnet
  prompt: "You research thoroughly and cite sources."

agent writer:
  model: opus
  prompt: "You write a concise summary."

parallel:
  findings = session: researcher
    prompt: "Research {topic}."
  draft = session: writer
    prompt: "Summarize {topic}."

session "Merge the findings + draft into a final answer."
context: { findings, draft }
```

## Mapping du runtime OpenClaw

Les programmes OpenProse correspondent aux primitives OpenClaw :

| Concept OpenProse                 | Outil OpenClaw   |
| --------------------------------- | ---------------- |
| Lancement de session / Outil Task | `sessions_spawn` |
| Lecture / écriture de fichier     | `read` / `write` |
| Récupération Web                  | `web_fetch`      |

<Warning>Si votre liste d'autorisation d'outils bloque `sessions_spawn`, `read`, `write` ou `web_fetch`OpenProse, les programmes OpenProse échoueront. Vérifiez votre [configuration de la liste d'autorisation des outils](/fr/gateway/config-tools).</Warning>

## Emplacements des fichiers

OpenProse conserve l'état sous OpenProse`.prose/` dans votre espace de travail :

```text
.prose/
├── .env
├── runs/
│   └── {YYYYMMDD}-{HHMMSS}-{random}/
│       ├── program.prose
│       ├── state.md
│       ├── bindings/
│       └── agents/
└── agents/
```

Les agents persistants au niveau de l'utilisateur résident à :

```text
~/.prose/agents/
```

## Backends d'état

<AccordionGroup>
  <Accordion title="système de fichiers (par défaut)">
    L'état est écrit dans `.prose/runs/...` dans l'espace de travail. Aucune
    dépendance supplémentaire requise.
  </Accordion>
  <Accordion title="in-context">
    État transitoire conservé dans la fenêtre de contexte. Convient aux petits programmes
    de courte durée.
  </Accordion>
  <Accordion title="sqlite (expérimental)">
    Nécessite le binaire `sqlite3` sur `PATH`.
  </Accordion>
  <Accordion title="postgres (expérimental)">
    Nécessite `psql` et une chaîne de connexion.

    <Warning>
      Les identifiants Postgres se retrouvent dans les journaux des sous-agents. Utilisez une base de données dédiée avec les privilèges minimum.
    </Warning>

  </Accordion>
</AccordionGroup>

## Sécurité

Traitez les fichiers `.prose` comme du code. Révisez-les avant de les exécuter. Utilisez les listes d'autorisation d'OpenClaw et les barrières d'approbation d'OpenClaw pour contrôler les effets secondaires. Pour les flux de travail déterministes avec barrières d'approbation, comparez avec [Lobster](/fr/tools/lobster).

## Connexes

<CardGroup cols={2}>
  <Card title="Référence des Skills" href="/fr/tools/skills" icon="puzzle-piece">
    Comment le pack de Skills d'OpenProse se charge et quelles barrières s'appliquent.
  </Card>
  <Card title="Sous-agents" href="/fr/tools/subagents" icon="users">
    La couche native de coordination multi-agent d'OpenClaw.
  </Card>
  <Card title="Synthèse vocale" href="/fr/tools/tts" icon="volume-high">
    Ajoutez une sortie audio à vos flux de travail.
  </Card>
  <Card title="Commandes slash" href="/fr/tools/slash-commands" icon="terminal">
    Toutes les commandes de chat disponibles, y compris /prose.
  </Card>
</CardGroup>

Site officiel : [https://www.prose.md](https://www.prose.md)
