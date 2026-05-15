---
summary: "Espace de travail de l'agent : emplacement, structure et stratégie de sauvegarde"
read_when:
  - You need to explain the agent workspace or its file layout
  - You want to back up or migrate an agent workspace
title: "Espace de travail de l'agent"
sidebarTitle: "Espace de travail de l'agent"
---

L'espace de travail est le domicile de l'agent. C'est le seul répertoire de travail utilisé pour les outils de fichiers et pour le contexte de l'espace de travail. Gardez-le privé et considérez-le comme une mémoire.

Ceci est séparé de `~/.openclaw/`, qui stocke la configuration, les identifiants et les sessions.

<Warning>
L'espace de travail est le **cwd par défaut**, pas un bac à sable strict. Les outils résolvent les chemins relatifs par rapport à l'espace de travail, mais les chemins absolus peuvent toujours atteindre d'autres parties de l'hôte sauf si le sandboxing est activé. Si vous avez besoin d'isolement, utilisez [`agents.defaults.sandbox`](/fr/gateway/sandboxing) (et/ou la configuration de sandbox par agent).

Lorsque le sandboxing est activé et que `workspaceAccess` n'est pas `"rw"`, les outils opèrent dans un espace de travail de bac à sable sous `~/.openclaw/sandboxes`, et non dans votre espace de travail hôte.

</Warning>

## Emplacement par défaut

- Par défaut : `~/.openclaw/workspace`
- Si `OPENCLAW_PROFILE` est défini et n'est pas `"default"`, la valeur par défaut devient `~/.openclaw/workspace-<profile>`.
- Remplacer dans `~/.openclaw/openclaw.json` :

```json5
{
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace",
    },
  },
}
```

`openclaw onboard`, `openclaw configure` ou `openclaw setup` créeront l'espace de travail et initialiseront les fichiers d'amorçage s'ils sont manquants.

<Note>Les copies d'amorçage de sandbox n'acceptent que les fichiers réguliers dans l'espace de travail ; les alias de lien symbolique/hardlink qui résolvent en dehors de l'espace de travail source sont ignorés.</Note>

Si vous gérez déjà vous-même les fichiers de l'espace de travail, vous pouvez désactiver la création des fichiers d'amorçage :

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## Dossiers supplémentaires de l'espace de travail

Les installations plus anciennes peuvent avoir créé `~/openclaw`. Conserver plusieurs répertoires d'espace de travail peut provoquer une dérive d'état ou une confusion d'authentification, car un seul espace de travail est actif à la fois.

<Note>
**Recommandation :** gardez un seul espace de travail actif. Si vous n'utilisez plus les dossiers supplémentaires, archivez-les ou déplacez-les dans la corbeille (par exemple `trash ~/openclaw`). Si vous conservez intentionnellement plusieurs espaces de travail, assurez-vous que `agents.defaults.workspace` pointe vers celui qui est actif.

`openclaw doctor` avertit lorsqu'il détecte des répertoires d'espace de travail supplémentaires.

</Note>

## Cartographie des fichiers de l'espace de travail

Voici les fichiers standards que OpenClaw s'attend à trouver dans l'espace de travail :

<AccordionGroup>
  <Accordion title="AGENTS.md - instructions de fonctionnement">Instructions de fonctionnement pour l'agent et comment il doit utiliser la mémoire. Chargées au début de chaque session. Bon endroit pour les règles, les priorités et les détails sur « comment se comporter ».</Accordion>
  <Accordion title="SOUL.md - personnalité et ton">Personnalité, ton et limites. Chargé à chaque session. Guide : [guide de personnalité SOUL.md](/fr/concepts/soul).</Accordion>
  <Accordion title="USER.md - qui est l'utilisateur">Qui est l'utilisateur et comment lui adresser la parole. Chargé à chaque session.</Accordion>
  <Accordion title="IDENTITY.md - nom, ambiance, emoji">Le nom, l'ambiance et l'emoji de l'agent. Créé/mis à jour lors du rituel d'amorçage.</Accordion>
  <Accordion title="TOOLS.md - conventions des outils locaux">Notes sur vos outils locaux et conventions. Ne contrôle pas la disponibilité des outils ; c'est uniquement une directive.</Accordion>
  <Accordion title="HEARTBEAT.md - liste de contrôle de heartbeat">Petite liste de contrôle facultative pour les exécutions de heartbeat. Gardez-la courte pour éviter la consommation de tokens.</Accordion>
  <Accordion title="BOOT.md - liste de contrôle de démarrage">Liste de contrôle de démarrage facultative exécutée automatiquement au redémarrage de la passerelle (lorsque les [hooks internes](/fr/automation/hooks) sont activés). Gardez-la courte ; utilisez l'outil de message pour les envois sortants.</Accordion>
  <Accordion title="BOOTSTRAP.md - rituel de premier démarrage">Rituel de premier démarrage unique. Créé uniquement pour un tout nouvel espace de travail. Supprimez-le une fois le rituel terminé.</Accordion>
  <Accordion title="memory/YYYY-MM-DD.md - journal de mémoire quotidien">Journal de mémoire quotidien (un fichier par jour). Il est recommandé de lire celui d'aujourd'hui et d'hier au début de la session.</Accordion>
  <Accordion title="MEMORY.md - mémoire à long terme sélectionnée (optionnel)">
    Mémoire à long terme sélectionnée : faits durables, préférences, décisions et courts résumés. Gardez les journaux détaillés dans `memory/YYYY-MM-DD.md` afin que les outils de mémoire puissent les récupérer à la demande sans les injecter dans chaque invite. Ne chargez `MEMORY.md` que dans la session principale et privée (pas les contextes partagés/groupes). Voir [Mémoire](/fr/concepts/memory)
    pour le flux de travail et le vidage automatique de la mémoire.
  </Accordion>
  <Accordion title="skills/ - compétences de l'espace de travail (optionnel)">
    Compétences spécifiques à l'espace de travail. Emplacement de compétences ayant la priorité la plus élevée pour cet espace de travail. Remplace les compétences de l'agent de projet, les compétences de l'agent personnel, les compétences gérées, les compétences groupées et `skills.load.extraDirs` en cas de collision de noms.
  </Accordion>
  <Accordion title="Canvascanvas/ - fichiers d'interface utilisateur Canvas (optionnel)" Canvas>
    Fichiers d'interface utilisateur Canvas pour les affichages de nœuds (par exemple `canvas/index.html`).
  </Accordion>
</AccordionGroup>

<Note>
  Si un fichier d'amorçage est manquant, OpenClaw injecte un marqueur de "fichier manquant" dans la session et continue. Les fichiers d'amorçage volumineux sont tronqués lors de l'injection ; ajustez les limites avec OpenClaw`agents.defaults.bootstrapMaxChars` (par défaut : 12000) et `agents.defaults.bootstrapTotalMaxChars` (par défaut : 60000). `openclaw setup` peut recréer les valeurs par défaut
  manquantes sans écraser les fichiers existants.
</Note>

## Ce qui n'est PAS dans l'espace de travail

Ces éléments se trouvent sous `~/.openclaw/` et ne doivent PAS être validés dans le dépôt de l'espace de travail :

- `~/.openclaw/openclaw.json` (config)
- `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (profils d'authentification de modèle : OAuth + clés API)
- `~/.openclaw/agents/<agentId>/agent/codex-home/` (compte d'exécution Codex par agent, config, compétences, plugins et état de thread natif)
- `~/.openclaw/credentials/` (état du canal/fournisseur plus les données d'importation OAuth héritées)
- `~/.openclaw/agents/<agentId>/sessions/` (transcriptions de session + métadonnées)
- `~/.openclaw/skills/` (compétences gérées)

Si vous devez migrer des sessions ou des configurations, copiez-les séparément et gardez-les hors du contrôle de version.

## Sauvegarde Git (recommandée, privée)

Traitez l'espace de travail comme une mémoire privée. Placez-le dans un dépôt git **privé** afin qu'il soit sauvegardé et récupérable.

Exécutez ces étapes sur la machine où le Gateway s'exécute (c'est là que réside l'espace de travail).

<Steps>
  <Step title="Initialiser le dépôt">
    Si git est installé, les nouveaux espaces de travail sont initialisés automatiquement. Si cet espace de travail n'est pas encore un dépôt, exécutez :

    ```bash
    cd ~/.openclaw/workspace
    git init
    git add AGENTS.md SOUL.md TOOLS.md IDENTITY.md USER.md HEARTBEAT.md memory/
    git commit -m "Add agent workspace"
    ```

  </Step>
  <Step title="Ajouter un dépôt distant privé">
    <Tabs>
      <Tab title="Interface Web GitHub">
        1. Créez un nouveau dépôt **privé** sur GitHub.
        2. Ne l'initialisez pas avec un README (évite les conflits de fusion).
        3. Copiez l'URL du distant HTTPS.
        4. Ajoutez le distant et effectuez un push :

        ```bash
        git branch -M main
        git remote add origin <https-url>
        git push -u origin main
        ```
      </Tab>
      <Tab title="GitHub CLI (gh)">
        ```bash
        gh auth login
        gh repo create openclaw-workspace --private --source . --remote origin --push
        ```
      </Tab>
      <Tab title="Interface Web GitLab">
        1. Créez un nouveau dépôt **privé** sur GitLab.
        2. Ne l'initialisez pas avec un README (évite les conflits de fusion).
        3. Copiez l'URL du distant HTTPS.
        4. Ajoutez le distant et effectuez un push :

        ```bash
        git branch -M main
        git remote add origin <https-url>
        git push -u origin main
        ```
      </Tab>
    </Tabs>

  </Step>
  <Step title="Mises à jour continues">
    ```bash
    git status
    git add .
    git commit -m "Update memory"
    git push
    ```
  </Step>
</Steps>

## Ne commitez pas de secrets

<Warning>
Même dans un dépôt privé, évitez de stocker des secrets dans l'espace de travail :

- Clés API, jetons OAuth, mots de passe ou informations d'identification privées.
- Tout ce qui se trouve sous APIOAuth`~/.openclaw/`.
- Sauvegardes brutes de discussions ou pièces jointes sensibles.

Si vous devez stocker des références sensibles, utilisez des espaces réservés et gardez le vrai secret ailleurs (gestionnaire de mots de passe, variables d'environnement ou `~/.openclaw/`).

</Warning>

Starter `.gitignore` suggéré :

```gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
```

## Déplacement de l'espace de travail vers une nouvelle machine

<Steps>
  <Step title="Clone the repo">
    Clonez le dépôt vers le chemin souhaité (par défaut `~/.openclaw/workspace`).
  </Step>
  <Step title="Update config">
    Définissez `agents.defaults.workspace` sur ce chemin dans `~/.openclaw/openclaw.json`.
  </Step>
  <Step title="Seed missing files">
    Exécutez `openclaw setup --workspace <path>` pour générer les fichiers manquants.
  </Step>
  <Step title="Copy sessions (optional)">
    Si vous avez besoin des sessions, copiez `~/.openclaw/agents/<agentId>/sessions/` séparément depuis l'ancienne machine.
  </Step>
</Steps>

## Notes avancées

- Le routage multi-agent peut utiliser des espaces de travail différents par agent. Voir [Channel routing](/fr/channels/channel-routing) pour la configuration du routage.
- Si `agents.defaults.sandbox` est activé, les sessions non principales peuvent utiliser des espaces de travail de bac à sable par session sous `agents.defaults.sandbox.workspaceRoot`.

## Connexes

- [Heartbeat](/fr/gateway/heartbeat) - fichier d'espace de travail HEARTBEAT.md
- [Sandboxing](/fr/gateway/sandboxing) - accès à l'espace de travail dans les environnements bac à sable
- [Session](/fr/concepts/session) - chemins de stockage de session
- [Standing orders](/fr/automation/standing-orders) - instructions persistantes dans les fichiers de l'espace de travail
