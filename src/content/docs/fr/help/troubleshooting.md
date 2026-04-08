---
summary: "Centre de dépannage basé sur les symptômes pour OpenClaw"
read_when:
  - OpenClaw is not working and you need the fastest path to a fix
  - You want a triage flow before diving into deep runbooks
title: "Dépannage général"
---

# Troubleshooting

Si vous n'avez que 2 minutes, utilisez cette page comme porte d'entrée de triage.

## Premières 60 secondes

Exécutez cette échelle exacte dans l'ordre :

```bash
openclaw status
openclaw status --all
openclaw gateway probe
openclaw gateway status
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

Bonne sortie en une ligne :

- `openclaw status` → affiche les canaux configurés et aucune erreur d'authentification évidente.
- `openclaw status --all` → le rapport complet est présent et partageable.
- `openclaw gateway probe` → la passerelle cible attendue est joignable (`Reachable: yes`). `RPC: limited - missing scope: operator.read` indique des diagnostics dégradés, et non un échec de connexion.
- `openclaw gateway status` → `Runtime: running` et `RPC probe: ok`.
- `openclaw doctor` → aucune erreur de configuration/service bloquante.
- `openclaw channels status --probe` → si la passerelle est joignable, renvoie l'état du transport en temps réel par compte ainsi que les résultats des sondages/audits tels que `works` ou `audit ok` ; si la
  passerelle est injoignable, la commande revient à des résumés de configuration uniquement.
- `openclaw logs --follow` → activité régulière, aucune erreur fatale répétée.

## Anthropic long context 429

Si vous voyez :
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`,
allez sur [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/en/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

## L'échec de l'installation du plugin avec les extensions openclaw manquantes

Si l'installation échoue avec `package.json missing openclaw.extensions`, le package du plugin
utilise une ancienne structure qu'OpenClaw n'accepte plus.

Correction dans le paquet du plugin :

1. Ajoutez `openclaw.extensions` à `package.json`.
2. Faites pointer les entrées vers les fichiers d'exécution construits (généralement `./dist/index.js`).
3. Republichez le plugin et exécutez `openclaw plugins install <package>` à nouveau.

Exemple :

```json
{
  "name": "@openclaw/my-plugin",
  "version": "1.2.3",
  "openclaw": {
    "extensions": ["./dist/index.js"]
  }
}
```

Référence : [Architecture du plugin](/en/plugins/architecture)

## Arbre de décision

```mermaid
flowchart TD
  A[OpenClaw is not working] --> B{What breaks first}
  B --> C[No replies]
  B --> D[Dashboard or Control UI will not connect]
  B --> E[Gateway will not start or service not running]
  B --> F[Channel connects but messages do not flow]
  B --> G[Cron or heartbeat did not fire or did not deliver]
  B --> H[Node is paired but camera canvas screen exec fails]
  B --> I[Browser tool fails]

  C --> C1[/No replies section/]
  D --> D1[/Control UI section/]
  E --> E1[/Gateway section/]
  F --> F1[/Channel flow section/]
  G --> G1[/Automation section/]
  H --> H1[/Node tools section/]
  I --> I1[/Browser section/]
```

<AccordionGroup>
  <Accordion title="Aucune réponse">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw channels status --probe
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    ```

    Un bon résultat ressemble à :

    - `Runtime: running`
    - `RPC probe: ok`
    - Votre channel affiche un transport connecté et, si pris en charge, `works` ou `audit ok` dans `channels status --probe`
    - L'expéditeur semble approuvé (ou la politique DM est ouverte/allowlist)

    Signatures de journal courantes :

    - `drop guild message (mention required` → le blocage par mention a bloqué le message dans Discord.
    - `pairing request` → l'expéditeur n'est pas approuvé et attend l'approbation de jumelage DM.
    - `blocked` / `allowlist` dans les journaux du channel → l'expéditeur, la salle ou le groupe est filtré.

    Pages approfondies :

    - [/gateway/troubleshooting#no-replies](/en/gateway/troubleshooting#no-replies)
    - [/channels/troubleshooting](/en/channels/troubleshooting)
    - [/channels/pairing](/en/channels/pairing)

  </Accordion>

  <Accordion title="Le tableau de bord ou l'interface de contrôle ne se connecte pas">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    Un résultat correct ressemble à :

    - `Dashboard: http://...` est affiché dans `openclaw gateway status`
    - `RPC probe: ok`
    - Pas de boucle d'authentification dans les journaux

    Signatures de journal courantes :

    - `device identity required` → le contexte HTTP/non sécurisé ne peut pas terminer l'authentification de l'appareil.
    - `origin not allowed` → le navigateur `Origin` n'est pas autorisé pour la cible
      de la passerelle de l'interface de contrôle.
    - `AUTH_TOKEN_MISMATCH` avec des indices de nouvelle tentative (`canRetryWithDeviceToken=true`) → une nouvelle tentative automatique d'un jeton d'appareil de confiance peut se produire.
    - Cette nouvelle tentative avec jeton mis en cache réutilise l'ensemble de portées mises en cache stockées avec le jeton
      d'appareil apparié. Les appelants avec `deviceToken` explicite / `scopes` explicite conservent
      leur ensemble de portées demandées à la place.
    - Sur le chemin asynchrone de l'interface de contrôle Tailscale Serve, les tentatives échouées pour le même
      `{scope, ip}` sont sérialisées avant que le limiteur n'enregistre l'échec, une
      deuxième mauvaise tentative simultanée peut donc déjà afficher `retry later`.
    - `too many failed authentication attempts (retry later)` depuis une origine de navigateur
      localhost → des échecs répétés depuis cette même `Origin` sont temporairement
      bloqués ; une autre origine localhost utilise un compartiment séparé.
    - `unauthorized` répétés après cette nouvelle tentative → mauvais jeton/mot de passe, inadéquation du mode d'authentification ou jeton d'appareil apparié périmé.
    - `gateway connect failed:` → l'interface cible la mauvaise URL/port ou une passerelle injoignable.

    Pages approfondies :

    - [/gateway/troubleshooting#dashboard-control-ui-connectivity](/en/gateway/troubleshooting#dashboard-control-ui-connectivity)
    - [/web/control-ui](/en/web/control-ui)
    - [/gateway/authentication](/en/gateway/authentication)

  </Accordion>

  <Accordion title="Le Gateway ne démarre pas ou le service est installé mais ne s'exécute pas">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    La sortie correcte ressemble à :

    - `Service: ... (loaded)`
    - `Runtime: running`
    - `RPC probe: ok`

    Signatures de journal courantes :

    - `Gateway start blocked: set gateway.mode=local` ou `existing config is missing gateway.mode` → le mode passerelle est distant, ou le fichier de configuration manque le tampon de mode local et doit être réparé.
    - `refusing to bind gateway ... without auth` → liaison non bouclée sans chemin d'authentification de passerelle valide (jeton/mot de passe, ou proxy de confiance si configuré).
    - `another gateway instance is already listening` ou `EADDRINUSE` → port déjà pris.

    Pages détaillées :

    - [/gateway/troubleshooting#gateway-service-not-running](/en/gateway/troubleshooting#gateway-service-not-running)
    - [/gateway/background-process](/en/gateway/background-process)
    - [/gateway/configuration](/en/gateway/configuration)

  </Accordion>

  <Accordion title="Le channel se connecte mais les messages ne circulent pas">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    La sortie correcte ressemble à :

    - Le transport du channel est connecté.
    - Les vérifications de couplage/liste blanche réussissent.
    - Les mentions sont détectées là où c'est requis.

    Signatures de journal courantes :

    - `mention required` → le blocage par mention de groupe a empêché le traitement.
    - `pairing` / `pending` → l'expéditeur du DM n'est pas encore approuvé.
    - `not_in_channel`, `missing_scope`, `Forbidden`, `401/403` → problème de jeton d'autorisation du channel.

    Pages détaillées :

    - [/gateway/troubleshooting#channel-connected-messages-not-flowing](/en/gateway/troubleshooting#channel-connected-messages-not-flowing)
    - [/channels/troubleshooting](/en/channels/troubleshooting)

  </Accordion>

  <Accordion title="Le cron ou le heartbeat ne s'est pas déclenché ou n'a pas été délivré">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw cron status
    openclaw cron list
    openclaw cron runs --id <jobId> --limit 20
    openclaw logs --follow
    ```

    Un bon résultat ressemble à ceci :

    - `cron.status` indique qu'il est activé avec un prochain réveil.
    - `cron runs` montre des entrées `ok` récentes.
    - Le heartbeat est activé et ne se trouve pas hors des heures actives.

    Signatures de journal courantes :

- `cron: scheduler disabled; jobs will not run automatically` → le cron est désactivé.
- `heartbeat skipped` avec `reason=quiet-hours` → hors des heures actives configurées.
- `heartbeat skipped` avec `reason=empty-heartbeat-file` → `HEARTBEAT.md` existe mais ne contient qu'une structure vide ou composée uniquement d'en-têtes.
- `heartbeat skipped` avec `reason=no-tasks-due` → le mode de tâche `HEARTBEAT.md` est actif mais aucun des intervalles de tâche n'est encore échu.
- `heartbeat skipped` avec `reason=alerts-disabled` → toute la visibilité du heartbeat est désactivée (`showOk`, `showAlerts` et `useIndicator` sont tous désactivés).
- `requests-in-flight` → la voie principale est occupée ; le réveil du heartbeat a été différé. - `unknown accountId` → le compte cible de la livraison du heartbeat n'existe pas.

      Pages approfondies :

      - [/gateway/troubleshooting#cron-and-heartbeat-delivery](/en/gateway/troubleshooting#cron-and-heartbeat-delivery)
      - [/automation/cron-jobs#troubleshooting](/en/automation/cron-jobs#troubleshooting)
      - [/gateway/heartbeat](/en/gateway/heartbeat)

    </Accordion>

    <Accordion title="Node is paired but tool fails camera canvas screen exec">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw nodes status
    openclaw nodes describe --node <idOrNameOrIp>
    openclaw logs --follow
    ```

      La sortie correcte ressemble à ceci :

      - Le nœud est répertorié comme connecté et apparié pour le rôle `node`.
      - La capacité existe pour la commande que vous invoquez.
      - L'état de l'autorisation est accordé pour l'outil.

      Signatures de journal courantes :

      - `NODE_BACKGROUND_UNAVAILABLE` → mettre l'application du nœud au premier plan.
      - `*_PERMISSION_REQUIRED` → l'autorisation du système d'exploitation a été refusée ou est manquante.
      - `SYSTEM_RUN_DENIED: approval required` → l'approbation d'exécution est en attente.
      - `SYSTEM_RUN_DENIED: allowlist miss` → la commande ne figure pas sur la liste d'autorisation d'exécution.

      Pages détaillées :

      - [/gateway/troubleshooting#node-paired-tool-fails](/en/gateway/troubleshooting#node-paired-tool-fails)
      - [/nodes/troubleshooting](/en/nodes/troubleshooting)
      - [/tools/exec-approvals](/en/tools/exec-approvals)

    </Accordion>

    <Accordion title="Exec demande soudainement une approbation">
    ```bash
    openclaw config get tools.exec.host
    openclaw config get tools.exec.security
    openclaw config get tools.exec.ask
    openclaw gateway restart
    ```

      Ce qui a changé :

      - Si `tools.exec.host` n'est pas défini, la valeur par défaut est `auto`.
      - `host=auto` résout à `sandbox` lorsqu'un runtime de bac à sable est actif, `gateway` sinon.
      - `host=auto` est uniquement du routage ; le comportement « YOLO » sans invite provient de `security=full` plus `ask=off` sur la passerelle/le nœud.
      - Sur `gateway` et `node`, si `tools.exec.security` n'est pas défini, la valeur par défaut est `full`.
      - Si `tools.exec.ask` n'est pas défini, la valeur par défaut est `off`.
      - Résultat : si vous voyez des approbations, une stratégie locale à l'hôte ou par session a resserré l'exécution par rapport aux paramètres par défaut actuels.

      Restaurer le comportement actuel par défaut sans approbation :

      ```bash
      openclaw config set tools.exec.host gateway
      openclaw config set tools.exec.security full
      openclaw config set tools.exec.ask off
      openclaw gateway restart
      ```

      Alternatives plus sûres :

      - Définissez uniquement `tools.exec.host=gateway` si vous voulez simplement un routage d'hôte stable.
      - Utilisez `security=allowlist` avec `ask=on-miss` si vous voulez une exécution sur l'hôte mais souhaitez toujours une révision en cas d'absence dans la liste d'autorisation.
      - Activez le mode bac à sable si vous voulez que `host=auto` résolve à nouveau à `sandbox`.

      Signatures de journal courantes :

      - `Approval required.` → la commande est en attente de `/approve ...`.
      - `SYSTEM_RUN_DENIED: approval required` → l'approbation d'exécution node-host est en attente.
      - `exec host=sandbox requires a sandbox runtime for this session` → sélection implicite/explicite du bac à sable mais le mode bac à sable est désactivé.

      Pages approfondies :

      - [/tools/exec](/en/tools/exec)
      - [/tools/exec-approvals](/en/tools/exec-approvals)
      - [/gateway/security#runtime-expectation-drift](/en/gateway/security#runtime-expectation-drift)

    </Accordion>

    <Accordion title="Échec de l'outil de navigateur">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw browser status
    openclaw logs --follow
    openclaw doctor
    ```

      Un résultat correct ressemble à :

      - L'état du navigateur affiche `running: true` et un navigateur/profil choisi.
      - `openclaw` démarre, ou `user` peut voir les onglets Chrome locaux.

      Signatures de journal courantes :

      - `unknown command "browser"` ou `unknown command 'browser'` → `plugins.allow` est défini et n'inclut pas `browser`.
      - `Failed to start Chrome CDP on port` → le lancement du navigateur local a échoué.
      - `browser.executablePath not found` → le chemin binaire configuré est incorrect.
      - `browser.cdpUrl must be http(s) or ws(s)` → l'URL CDP configurée utilise un schéma non pris en charge.
      - `browser.cdpUrl has invalid port` → l'URL CDP configurée a un port incorrect ou hors plage.
      - `No Chrome tabs found for profile="user"` → le profil de rattachement Chrome MCP n'a aucun onglet Chrome local ouvert.
      - `Remote CDP for profile "<name>" is not reachable` → le point de terminaison CDP distant configuré n'est pas accessible à partir de cet hôte.
      - `Browser attachOnly is enabled ... not reachable` ou `Browser attachOnly is enabled and CDP websocket ... is not reachable` → le profil de rattachement uniquement n'a aucune cible CDP active.
      - substitutions de viewport obsolète / mode sombre / langue / hors ligne sur les profils CDP distants ou de rattachement uniquement → exécutez `openclaw browser stop --browser-profile <name>` pour fermer la session de contrôle active et libérer l'état d'émulation sans redémarrer la passerelle.

      Pages approfondies :

      - [/gateway/troubleshooting#browser-tool-fails](/en/gateway/troubleshooting#browser-tool-fails)
      - [/tools/browser#missing-browser-command-or-tool](/en/tools/browser#missing-browser-command-or-tool)
      - [/tools/browser-linux-troubleshooting](/en/tools/browser-linux-troubleshooting)
      - [/tools/browser-wsl2-windows-remote-cdp-troubleshooting](/en/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

    </Accordion>
</AccordionGroup>

## Connexes

- [FAQ](/en/help/faq) — questions fréquemment posées
- [Dépannage de la Gateway](/en/gateway/troubleshooting) — problèmes spécifiques à la passerelle
- [Doctor](/en/gateway/doctor) — vérifications de santé automatisées et réparations
- [Dépannage de canal](/en/channels/troubleshooting) — problèmes de connectivité de canal
- [Dépannage de l'automatisation](/en/automation/cron-jobs#troubleshooting) — problèmes cron et heartbeat
