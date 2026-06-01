---
summary: "Ajoute des vérifications du médecin basées sur des stratégies pour la conformité de l'espace de travail."
read_when:
  - You are installing, configuring, or auditing the policy plugin
title: "Plugin de stratégie"
---

# Plugin de stratégie

Ajoute des vérifications du médecin basées sur des stratégies pour la conformité de l'espace de travail.

## Distribution

- Package : `@openclaw/policy`
- Route d'installation : inclus dans OpenClaw

## Surface

plugin

{/* openclaw-plugin-reference:manual-start */}

## Comportement

Le plugin Policy contribue aux contrôles de santé du médecin pour les paramètres OpenClaw gérés par stratégie et les déclarations d'espace de travail gouvernées. La stratégie couvre actuellement la conformité des canaux, les métadonnées des outils gouvernés, la posture du serveur MCP, la posture du fournisseur de modèles, la posture d'accès au réseau privé, la posture d'exposition Gateway, la posture de l'espace de travail/outils de l'agent, la posture configurée des outils global/par agent, la posture configurée du runtime du bac à sable, la posture d'accès ingress/canal, et la posture du fournisseur/profil d'authentification des secrets de configuration OpenClaw.

La stratégie stocke les exigences rédigées dans `policy.jsonc`, observe les paramètres OpenClaw existants et les déclarations d'espace de travail comme preuves, et signale les dérives via `openclaw policy check` et `openclaw doctor --lint`. Un contrôle de stratégie propre émet des hachages de stratégie, de preuves, de constatations et d'attestation que les opérateurs peuvent enregistrer pour l'audit.

`openclaw policy compare --baseline <file>` compare un fichier de stratégie à un autre fichier de stratégie. Il s'agit uniquement d'une conformité au niveau de la configuration : il utilise les métadonnées des règles de stratégie pour vérifier que la stratégie vérifiée n'est pas manquante ou plus faible que la base de référence rédigée, et il n'inspecte pas l'état d'exécution, les informations d'identification ou les valeurs secrètes.

Les règles de posture des outils peuvent exiger des profils approuvés, des outils de système de fichiers uniquement pour l'espace de travail, des paramètres de sécurité/demande/hôte d'exécution bornés, le mode élevé désactivé, des entrées `alsoAllow` exactes et des entrées de refus d'outil requises. Les preuves enregistrent les entrées `alsoAllow` additives car elles peuvent élargir la posture effective des outils. Ces contrôles observent uniquement la conformité de la configuration ; ils ne lisent pas l'état d'approbation d'exécution et n'ajoutent pas d'exécution.

Les règles de posture du bac à sable peuvent exiger des modes/backends de bac à sable approuvés, refuser la mise en réseau des conteneurs hôtes, refuser les jointures d'espace de noms de conteneurs, exiger des montages de conteneurs en lecture seule, refuser les montages de sockets de runtime de conteneur et les profils de conteneurs non confinés, et exiger des plages sources CDP du navigateur du bac à sable. Ces contrôles observent uniquement la conformité de la configuration ; ils ne lisent pas l'état d'approbation d'exécution, n'inspectent pas les conteneurs en direct et n'ajoutent pas d'exécution.

Les portées de stratégie nommées sous `scopes.<scopeName>` peuvent ajouter des sections de stratégie normale plus strictes pour le sélecteur qu'elles listent. `agentIds` prend en charge `tools`, `agents.workspace` et `sandbox` ; `channelIds` prend en charge `ingress.channels`. Les ID d'agents d'exécution qui ne sont pas explicitement listés dans `agents.list[]` sont vérifiés par rapport à la posture globale/défaut héritée plutôt que de passer silencieusement sans preuve. Chaque portée présente dans `policy.jsonc` doit être valide et applicable pour son sélecteur. Les règles de superposition sont des revendications supplémentaires, elles n'affaiblissent donc pas la stratégie de niveau supérieur et peuvent produire leurs propres constatations lorsque la même configuration observée viole les deux portées.

{/* openclaw-plugin-reference:manual-end */}

## Documentation associée

- [policy](/fr/cli/policy)
