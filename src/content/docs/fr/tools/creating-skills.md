---
summary: "Concevoir et tester des compétences d'espace de travail personnalisées avec SKILL.md"
title: "Création de compétences"
read_when:
  - You are creating a new custom skill in your workspace
  - You need a quick starter workflow for SKILL.md-based skills
---

Les compétences enseignent à l'agent comment et quand utiliser les outils. Chaque compétence est un répertoire contenant un fichier `SKILL.md` avec des en-têtes YAML et des instructions en markdown.

Pour savoir comment les compétences sont chargées et priorisées, consultez [Compétences](/fr/tools/skills).

## Créer votre première compétence

<Steps>
  <Step title="Créer le répertoire de la compétence">
    Les compétences résident dans votre espace de travail. Créez un nouveau dossier :

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/hello-world
    ```

    Vous pouvez regrouper les compétences dans des sous-dossiers lorsque votre bibliothèque s'agrandit :

    ```bash
    mkdir -p ~/.openclaw/workspace/skills/personal/hello-world
    ```

    Les dossiers de groupe sont uniquement organisationnels. La compétence est toujours nommée par l'en-tête `SKILL.md`, donc `name: hello-world` est invoquée comme `/hello-world`.

  </Step>

  <Step title="Écrire SKILL.md">
    Créez `SKILL.md` à l'intérieur de ce répertoire. L'en-tête définit les métadonnées et le corps markdown contient les instructions pour l'agent.

    ```markdown
    ---
    name: hello-world
    description: A simple skill that says hello.
    ---

    # Hello World Skill

    When the user asks for a greeting, use the `echo` tool to say
    "Hello from your custom skill!".
    ```

    Utilisez le cas avec tirets (hyphen-case) avec des lettres minuscules, des chiffres et des tirets pour le `name` de la compétence. Gardez le nom du dossier feuille et l'en-tête `name` alignés.

  </Step>

  <Step title="Ajouter des outils (optionnel)">
    Vous pouvez définir des schémas d'outils personnalisés dans l'en-tête ou demander à l'agent d'utiliser les outils système existants (comme `exec` ou `browser`). Les compétences peuvent également être livrées dans des plugins à côté des outils qu'elles documentent.

  </Step>

  <Step title="Charger la compétence">
    Vérifiez que la compétence est chargée :

    ```bash
    openclaw skills list
    ```

    OpenClaw surveille les fichiers `SKILL.md` imbriqués sous les racines de compétences. Si la surveillance est désactivée ou si vous continuez une session existante, démarrez une nouvelle session pour que le modèle reçoive la liste actualisée des compétences :

    ```bash
    # From chat
    /new

    # Or restart the gateway
    openclaw gateway restart
    ```

  </Step>

  <Step title="Testez-le">
    Envoyez un message qui doit déclencher le skill :

    ```bash
    openclaw agent --message "give me a greeting"
    ```

    Ou simplement discutez avec l'agent et demandez une salutation.

  </Step>
</Steps>

## Proposer avant d'appliquer

Pour les procédures générées par l'agent, utilisez une proposition de Skill Workshop au lieu
d'écrire `SKILL.md` directement :

```bash
openclaw skills workshop propose-create \
  --name "hello-world" \
  --description "A simple skill that says hello." \
  --proposal ./PROPOSAL.md
```

Utilisez `--proposal-dir` lorsque la proposition contient également des fichiers de support :

```bash
openclaw skills workshop propose-create \
  --name "hello-world" \
  --description "A simple skill that says hello." \
  --proposal-dir ./hello-world-proposal
```

Le brouillon est stocké sous
`<OPENCLAW_STATE_DIR>/skill-workshop/proposals/<proposal-id>/PROPOSAL.md` et
reste inactif jusqu'à ce qu'un opérateur le révise et l'applique. Le répertoire d'état
par défaut est `~/.openclaw`. Les répertoires de propositions doivent contenir `PROPOSAL.md`.
Les fichiers de support peuvent être inclus sous `assets/`, `examples/`, `references/`,
`scripts/` ou `templates/` ; OpenClaw les stocke et les analyse avec la proposition :

```bash
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
openclaw skills workshop apply <proposal-id>
```

Lorsqu'elle est appliquée, OpenClaw écrit le `SKILL.md` final dans la racine du `skills/`
de l'espace de travail, écrit les fichiers de support approuvés à côté, et supprime les métadonnées
propre à la proposition telles que `status: proposal`, la proposition `version` et la proposition
`date`.

## Référence des métadonnées de Skill

Le frontmatter YAML prend en charge ces champs :

| Champ                               | Obligatoire | Description                                                                     |
| ----------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| `name`                              | Oui         | Identifiant unique utilisant des lettres minuscules, des chiffres et des tirets |
| `description`                       | Oui         | Description en une ligne affichée à l'agent                                     |
| `metadata.openclaw.os`              | Non         | Filtre OS (`["darwin"]`, `["linux"]`, etc.)                                     |
| `metadata.openclaw.requires.bins`   | Non         | Binaires requis dans le PATH                                                    |
| `metadata.openclaw.requires.config` | Non         | Clés de configuration requises                                                  |

## Fonctionnalités avancées

Une fois qu'un skill de base fonctionne, ces champs aident à le rendre fiable et portable :

- **Activation conditionnelle** — utilisez `requires.bins`, `requires.env` ou
  `requires.config` pour charger le skill uniquement lorsque les dépendances requises sont
  disponibles. Voir [Référence des Skills : gating](/fr/tools/skills#gating).
- **Environnement et câblage de clé d'API** — utilisez API`skills.entries.<name>.env` et
  `skills.entries.<name>.apiKey` pour injecter l'environnement côté hôte pour un tour
  de compétence. Voir [Référence des compétences : câblage de la configuration](/fr/tools/skills#config-wiring).
- **Contrôle d'invocation** — définissez `user-invocable: false` pour masquer une commande slash,
  ou `disable-model-invocation: true` pour empêcher une compétence de style commande d'apparaître dans
  le prompt du modèle. Voir [Référence des compétences : frontmatter](/fr/tools/skills#frontmatter).
- **Répartition directe des commandes** — utilisez `command-dispatch: tool` avec
  `command-tool` lorsqu'une commande slash doit appeler un outil directement au lieu de
  passer par le modèle.
- **Chemins portables** — utilisez `{baseDir}` dans `SKILL.md` lors du référencement de scripts
  ou de ressources dans le répertoire de la compétence.
- **Publication** — utilisez la compétence ClawHub lors de la préparation d'une compétence pour publication.
  Elle documente la forme actuelle de la commande ClawHub`clawhub publish` et les métadonnées
  requises.

## Bonnes pratiques

- **Soyez concis** — indiquez au modèle _quoi_ faire, pas comment être une IA
- **Sécurité avant tout** — si votre compétence utilise `exec`, assurez-vous que les invites ne permettent pas l'injection de commandes arbitraires à partir d'une entrée non fiable
- **Testez localement** — utilisez `openclaw agent --message "..."` pour tester avant de partager
- **Utiliser ClawHub** — parcourez et contribuez aux compétences sur [ClawHub](ClawHubClawHubhttps://clawhub.ai)

## Où vivent les compétences

| Emplacement                     | Priorité       | Portée                          |
| ------------------------------- | -------------- | ------------------------------- |
| `\<workspace\>/skills/`         | La plus élevée | Par agent                       |
| `\<workspace\>/.agents/skills/` | Élevée         | Par agent d'espace de travail   |
| `~/.agents/skills/`             | Moyenne        | Profil d'agent partagé          |
| `~/.openclaw/skills/`           | Moyenne        | Partagé (tous les agents)       |
| Intégré (livré avec OpenClaw)   | Faible         | Global                          |
| `skills.load.extraDirs`         | La plus faible | Dossiers partagés personnalisés |

Chaque racine de compétences peut contenir des dossiers de compétence directs tels que
`skills/hello-world/SKILL.md` ou des dossiers groupés tels que
`skills/personal/hello-world/SKILL.md`.

## Connexes

- [Référence des compétences](/fr/tools/skills) — règles de chargement, de priorité et de filtrage
- [Configuration des Skills](/fr/tools/skills-config) — `skills.*` schéma de configuration
- [ClawHub](ClawHub/en/clawhub) — registre public de Skills
- [Création de plugins](/fr/plugins/building-plugins) — les plugins peuvent inclure des Skills
