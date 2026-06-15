---
title: "Création de compétences"
sidebarTitle: "Création de compétences"
summary: "Créez, testez et publiez des compétences de workspace SKILL.md personnalisées pour vos agents OpenClaw."
read_when:
  - You are creating a new custom skill
  - You need a quick starter workflow for SKILL.md-based skills
  - You want to use Skill Workshop to propose a skill for agent review
---

Les compétences enseignent à l'agent comment et quand utiliser les outils. Chaque compétence est un répertoire contenant un fichier `SKILL.md` avec des en-têtes YAML et des instructions Markdown.
OpenClaw charge les compétences à partir de plusieurs racines dans un [ordre de priorité](/fr/tools/skills#loading-order) défini.

## Créer votre première compétence

<Steps>
  <Step title="Créer le répertoire de la compétence">
    Les compétences résident dans le dossier `skills/` de votre espace de travail. Créez un répertoire pour votre
    nouvelle compétence :

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

    Vous pouvez regrouper les compétences dans des sous-dossiers pour l'organisation — la compétence est toujours
    nommée par les en-têtes `SKILL.md`, et non par le chemin du dossier :

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/personal/hello-world
    # skill name is still "hello-world", invoked as /hello-world
    ```

  </Step>

  <Step title="Écrire SKILL.md">
    Créez `SKILL.md` à l'intérieur du répertoire. Les en-têtes définissent les métadonnées ;
    le corps donne les instructions à l'agent.

    ```markdown
    ---
    name: hello-world
    description: A simple skill that prints a greeting.
    ---

    # Hello World

    When the user asks for a greeting, use the `exec` tool to run:

    ```bash
    echo "Bonjour de votre compétence personnalisée !"
    ```
    ```

    Règles de nommage :
    - Utilisez des lettres minuscules, des chiffres et des tirets pour `name`.
    - Gardez le nom du répertoire et `name` des en-têtes alignés.
    - `description` est affiché à l'agent et dans la découverte des commandes slash —
      gardez-le sur une ligne et sous 160 caractères.

  </Step>

  <Step title="Vérifier le chargement de la compétence">
    ```bash
    openclaw skills list
    ```

    OpenClaw surveille les fichiers `SKILL.md` sous les racines de compétences par défaut. Si la
    surveillance est désactivée ou si vous continuez une session existante, démarrez une nouvelle
    session pour que l'agent reçoive la liste actualisée :

    ```bash
    # From chat — archive current session and start fresh
    /new

    # Or restart the gateway
    openclaw gateway restart
    ```

  </Step>

  <Step title="Test it">
    Envoyez un message qui doit déclencher la compétence :

    ```bash
    openclaw agent --message "give me a greeting"
    ```

    Ou ouvrez une conversation et demandez directement à l'agent. Utilisez `/skill hello-world` pour
    l'invoquer explicitement par son nom.

  </Step>
</Steps>

## Référence SKILL.md

### Champs obligatoires

| Champ         | Description                                                                    |
| ------------- | ------------------------------------------------------------------------------ |
| `name`        | Identifiant unique (slug) utilisant des minuscules, des chiffres et des tirets |
| `description` | Description en une ligne affichée à l'agent et dans la sortie de découverte    |

### Clés de frontmatter facultatives

| Champ                      | Par défaut | Description                                                                                        |
| -------------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| `user-invocable`           | `true`     | Exposer la compétence en tant que commande slash utilisateur                                       |
| `disable-model-invocation` | `false`    | Garder la compétence hors du prompt système de l'agent (s'exécute toujours via `/skill`)           |
| `command-dispatch`         | —          | Définir sur `tool` pour router la commande slash directement vers un tool, en contournant le model |
| `command-tool`             | —          | Nom du tool à invoquer lorsque `command-dispatch: tool` est défini                                 |
| `command-arg-mode`         | `raw`      | Pour la répartition vers un tool, transmet la chaîne d'arguments brute au tool                     |
| `homepage`                 | —          | URL affichée comme « Site Web » dans l'interface Skills de macOS                                   |

Pour les champs de contrôle d'accès (`requires.bins`, `requires.env`, etc.), voir
[Skills — Gating](/fr/tools/skills#gating).

### Utilisation de `{baseDir}`

Utilisez `{baseDir}` dans le corps de la compétence pour référencer des fichiers dans le répertoire de la compétence
sans coder les chemins en dur :

```markdown
Run the helper script at `{baseDir}/scripts/run.sh`.
```

## Ajout d'une activation conditionnelle

Verrouillez votre compétence afin qu'elle ne se charge que lorsque ses dépendances sont disponibles :

```markdown
---
name: gemini-search
description: Search using Gemini CLI.
metadata: { "openclaw": { "requires": { "bins": ["gemini"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

<AccordionGroup>
  <Accordion title="Options de verrouillage">
    | Clé | Description |
    | --- | --- |
    | `requires.bins` | Tous les binaires doivent exister sur `PATH` |
    | `requires.anyBins` | Au moins un binaire doit exister sur `PATH` |
    | `requires.env` | Chaque env var doit exister dans le processus ou la configuration |
    | `requires.config` | Chaque chemin `openclaw.json` doit être véridique |
    | `os` | Filtre de plateforme : `["darwin"]`, `["linux"]`, `["win32"]` |
    | `always` | Définir `true` pour ignorer toutes les portes et toujours inclure la compétence |

    Référence complète : [Skills — Gating](/fr/tools/skills#gating).

  </Accordion>
  <Accordion title="Environnement et clés API">
    Connectez une clé API à une entrée de compétence dans `openclaw.json` :

    ```json5
    {
      skills: {
        entries: {
          "gemini-search": {
            enabled: true,
            apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" },
          },
        },
      },
    }
    ```

    La clé est injectée dans le processus hôte uniquement pour ce tour d'agent.
    Elle n'atteint pas le bac à sable — voir
    [sandboxed env vars](/fr/tools/skills-config#sandboxed-skills-and-env-vars).

  </Accordion>
</AccordionGroup>

## Proposer via Skill Workshop

Pour les compétences rédigées par l'agent ou lorsque vous souhaitez une révision par l'opérateur avant qu'une compétence ne soit
en ligne, utilisez les propositions [Skill Workshop](/fr/tools/skill-workshop) au lieu d'écrire
directement `SKILL.md`.

```bash
# Propose a brand-new skill
openclaw skills workshop propose-create \
  --name "hello-world" \
  --description "A simple skill that prints a greeting." \
  --proposal ./PROPOSAL.md

# Propose an update to an existing skill
openclaw skills workshop propose-update hello-world \
  --proposal ./PROPOSAL.md \
  --description "Updated greeting skill"
```

Utilisez `--proposal-dir` lorsque la proposition inclut des fichiers de support :

```bash
openclaw skills workshop propose-create \
  --name "hello-world" \
  --description "A simple skill that prints a greeting." \
  --proposal-dir ./hello-world-proposal/
```

Le répertoire doit contenir `PROPOSAL.md`. Les fichiers de support peuvent être placés dans `assets/`,
`examples/`, `references/`, `scripts/`, ou `templates/`.

Après révision :

```bash
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop apply <proposal-id>
```

Voir [Skill Workshop](/fr/tools/skill-workshop) pour le cycle de vie complet de la proposition.

## Publication sur ClawHub

<Steps>
  <Step title="Assurez-vous que votre SKILL.md est complet">
    Assurez-vous que `name`, `description` et tous les champs `metadata.openclaw`
    sont définis. Ajoutez une URL `homepage` si vous disposez d'une page de projet.
  </Step>
  <Step title="ClawHubInstaller le skill ClawHub"ClawHub>
    Le skill ClawHub documente la forme actuelle de la commande de publication et les métadonnées requises :

    ```bash
    openclaw skills install clawhub-publish
    ```

  </Step>
  <Step title="Publier">
    ```bash
    clawhub publish
    ```ClawHub

    Consultez [ClawHub — Publication](/en/clawhub/publishing) pour le flux complet.

  </Step>
</Steps>

## Bonnes pratiques

<Tip>
  - **Soyez concis** — indiquez au modèle *ce qu'il faut* faire, et non comment être une IA. - **La sécurité avant tout** — si votre skill utilise `exec`, assurez-vous que les invites ne permettent pas l'injection arbitraire de commandes depuis des entrées non fiables. - **Testez localement** — utilisez `openclaw agent --message "..."`ClawHub avant de partager. - **Utilisez ClawHub** — parcourez
  les skills de la communauté sur [clawhub.ai](https://clawhub.ai) avant de partir de zéro.
</Tip>

## Connexes

<CardGroup cols={2}>
  <Card title="Référence des Skills" href="/en/tools/skills" icon="puzzle-piece">
    Ordre de chargement, gating, listes d'autorisation et format SKILL.md.
  </Card>
  <Card title="Skill Workshop" href="/en/tools/skill-workshop" icon="flask">
    File de proposition pour les skills rédigés par l'agent.
  </Card>
  <Card title="Config des Skills" href="/en/tools/skills-config" icon="gear">
    Schéma de configuration complet `skills.*`.
  </Card>
  <Card title="ClawHubClawHub" href="/en/clawhub" icon="cloud">
    Parcourez et publiez des compétences sur le registre public.
  </Card>
  <Card title="Building plugins" href="/en/plugins/building-plugins" icon="plug">
    Les plugins peuvent fournir des compétences avec les outils qu'ils documentent.
  </Card>
</CardGroup>
