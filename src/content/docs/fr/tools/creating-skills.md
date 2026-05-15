---
summary: "Créer et tester des compétences d'espace de travail personnalisées avec SKILL.md"
title: "Création de compétences"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

Les compétences enseignent à l'agent comment et quand utiliser les outils. Chaque compétence est un répertoire contenant un fichier `SKILL.md` avec des en-têtes YAML et des instructions markdown.

Pour savoir comment les compétences sont chargées et priorisées, consultez [Skills](/fr/tools/skills).

## Créer votre première compétence

<Steps>
  <Step title="Créer le répertoire de la compétence">
    Les compétences résident dans votre espace de travail. Créez un nouveau dossier :

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

  </Step>

  <Step title="Write SKILL.md">
    Créez `SKILL.md` dans ce répertoire. La page frontmatter définit les métadonnées,
    et le corps markdown contient les instructions pour l'agent.

    ```markdown
    ---
    name: hello-world
    description: A simple skill that says hello.
    ---

    # Hello World Skill

    When the user asks for a greeting, use the `echo` tool to say
    "Hello from your custom skill!".
    ```

    Utilisez le format kebab-case avec des lettres minuscules, des chiffres et des traits d'union pour l'identifiant de la compétence
    `name`. Gardez le nom du dossier et `name` de la page frontmatter alignés.

  </Step>

  <Step title="Add tools (optional)">
    Vous pouvez définir des schémas d'outil personnalisés dans la page frontmatter ou instruire l'agent
    à utiliser des outils système existants (comme `exec` ou `browser`). Les compétences peuvent également
    être livrées dans des plugins aux côtés des outils qu'elles documentent.

  </Step>

  <Step title="Charger la compétence">
    Démarrez une nouvelle session pour que OpenClaw prenne en compte la compétence :

    ```bash
    # From chat
    /new

    # Or restart the gateway
    openclaw gateway restart
    ```

    Vérifiez que la compétence a été chargée :

    ```bash
    openclaw skills list
    ```

  </Step>

  <Step title="Testez-la">
    Envoyez un message qui devrait déclencher la compétence :

    ```bash
    openclaw agent --message "give me a greeting"
    ```

    Ou simplement discutez avec l'agent et demandez une salutation.

  </Step>
</Steps>

## Référence des métadonnées de compétence

L'en-tête YAML prend en charge ces champs :

| Champ                               | Obligatoire | Description                                                                             |
| ----------------------------------- | ----------- | --------------------------------------------------------------------------------------- |
| `name`                              | Oui         | Identifiant unique utilisant des lettres minuscules, des chiffres et des traits d'union |
| `description`                       | Oui         | Description sur une ligne affichée à l'agent                                            |
| `metadata.openclaw.os`              | Non         | Filtre OS (`["darwin"]`, `["linux"]`, etc.)                                             |
| `metadata.openclaw.requires.bins`   | Non         | Binaires requis sur le PATH                                                             |
| `metadata.openclaw.requires.config` | Non         | Clés de configuration requises                                                          |

## Meilleures pratiques

- **Soyez concis** — indiquez au modèle _quoi_ faire, pas comment être une IA
- **Sécurité avant tout** — si votre compétence utilise `exec`, assurez-vous que les invites n'autorisent pas l'injection arbitraire de commandes provenant d'une entrée non fiable
- **Tester localement** — utilisez `openclaw agent --message "..."` pour tester avant de partager
- **Utiliser ClawHub** — parcourez et contribuez aux compétences sur [ClawHub](ClawHubClawHubhttps://clawhub.ai)

## Où se trouvent les skills

| Emplacement                     | Priorité       | Portée                           |
| ------------------------------- | -------------- | -------------------------------- |
| `\<workspace\>/skills/`         | La plus élevée | Par agent                        |
| `\<workspace\>/.agents/skills/` | Élevée         | Par agent de l'espace de travail |
| `~/.agents/skills/`             | Moyenne        | Profil d'agent partagé           |
| `~/.openclaw/skills/`           | Moyenne        | Partagé (tous les agents)        |
| Groupé (livré avec OpenClaw)    | Faible         | Global                           |
| `skills.load.extraDirs`         | La plus faible | Dossiers partagés personnalisés  |

## Connexes

- [Référence des compétences](/fr/tools/skills) — chargement, priorité et règles de filtrage
- [Config des compétences](/fr/tools/skills-config) — schéma de config `skills.*`
- [ClawHub](ClawHub/en/clawhub) — registre public de compétences
- [Création de plugins](/fr/plugins/building-plugins) — les plugins peuvent livrer des compétences
