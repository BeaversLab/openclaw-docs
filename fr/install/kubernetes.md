---
summary: "Déployer la passerelle OpenClaw sur un cluster Kubernetes avec Kustomize"
read_when:
  - You want to run OpenClaw on a Kubernetes cluster
  - You want to test OpenClaw in a Kubernetes environment
title: "Kubernetes"
---

# OpenClaw sur Kubernetes

Un point de départ minimal pour exécuter OpenClaw sur Kubernetes — il ne s'agit pas d'un déploiement prêt pour la production. Il couvre les ressources principales et est destiné à être adapté à votre environnement.

## Pourquoi pas Helm ?

OpenClaw est un conteneur unique avec quelques fichiers de configuration. La personnalisation intéressante réside dans le contenu de l'agent (fichiers markdown, compétences, substitutions de configuration), et non dans le modèle d'infrastructure. Kustomize gère les superpositions sans la surcharge d'un graphique Helm. Si votre déploiement devient plus complexe, un graphique Helm peut être superposé à ces manifests.

## Ce dont vous avez besoin

- Un cluster Kubernetes en cours d'exécution (AKS, EKS, GKE, k3s, kind, OpenShift, etc.)
- `kubectl` connecté à votre cluster
- Une clé API pour au moins un fournisseur de modèle

## Démarrage rapide

```bash
# Replace with your provider: ANTHROPIC, GEMINI, OPENAI, or OPENROUTER
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh

kubectl port-forward svc/openclaw 18789:18789 -n openclaw
open http://localhost:18789
```

Récupérez le jeton de la passerelle et collez-le dans l'interface de contrôle :

```bash
kubectl get secret openclaw-secrets -n openclaw -o jsonpath='{.data.OPENCLAW_GATEWAY_TOKEN}' | base64 -d
```

Pour le débogage local, `./scripts/k8s/deploy.sh --show-token` affiche le jeton après le déploiement.

## Test local avec Kind

Si vous n'avez pas de cluster, créez-en un localement avec [Kind](https://kind.sigs.k8s.io/) :

```bash
./scripts/k8s/create-kind.sh           # auto-detects docker or podman
./scripts/k8s/create-kind.sh --delete  # tear down
```

Ensuite, déployez comme d'habitude avec `./scripts/k8s/deploy.sh`.

## Étape par étape

### 1) Déployer

**Option A** — clé API dans l'environnement (une étape) :

```bash
# Replace with your provider: ANTHROPIC, GEMINI, OPENAI, or OPENROUTER
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh
```

Le script crée un secret Kubernetes avec la clé API et un jeton de passerelle généré automatiquement, puis déploie. Si le secret existe déjà, il conserve le jeton de passerelle actuel et toutes les clés de fournisseur qui ne sont pas modifiées.

**Option B** — créer le secret séparément :

```bash
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh --create-secret
./scripts/k8s/deploy.sh
```

Utilisez `--show-token` avec l'une ou l'autre commande si vous souhaitez que le jeton soit affiché sur stdout pour un test local.

### 2) Accéder à la passerelle

```bash
kubectl port-forward svc/openclaw 18789:18789 -n openclaw
open http://localhost:18789
```

## Ce qui est déployé

```
Namespace: openclaw (configurable via OPENCLAW_NAMESPACE)
├── Deployment/openclaw        # Single pod, init container + gateway
├── Service/openclaw           # ClusterIP on port 18789
├── PersistentVolumeClaim      # 10Gi for agent state and config
├── ConfigMap/openclaw-config  # openclaw.json + AGENTS.md
└── Secret/openclaw-secrets    # Gateway token + API keys
```

## Personnalisation

### Instructions de l'agent

Modifiez le `AGENTS.md` dans `scripts/k8s/manifests/configmap.yaml` et redéployez :

```bash
./scripts/k8s/deploy.sh
```

### Configuration de la passerelle

Modifiez `openclaw.json` dans `scripts/k8s/manifests/configmap.yaml`. Consultez [configuration de Gateway](/fr/gateway/configuration) pour la référence complète.

### Ajouter des providers

Relancez avec des clés supplémentaires exportées :

```bash
export ANTHROPIC_API_KEY="..."
export OPENAI_API_KEY="..."
./scripts/k8s/deploy.sh --create-secret
./scripts/k8s/deploy.sh
```

Les clés de provider existantes restent dans le Secret sauf si vous les écrasez.

Ou appliquez directement un correctif au Secret :

```bash
kubectl patch secret openclaw-secrets -n openclaw \
  -p '{"stringData":{"<PROVIDER>_API_KEY":"..."}}'
kubectl rollout restart deployment/openclaw -n openclaw
```

### Espace de noms personnalisé

```bash
OPENCLAW_NAMESPACE=my-namespace ./scripts/k8s/deploy.sh
```

### Image personnalisée

Modifiez le champ `image` dans `scripts/k8s/manifests/deployment.yaml` :

```yaml
image: ghcr.io/openclaw/openclaw:2026.3.1
```

### Exposition au-delà du transfert de port

Les manifestes par défaut lient la passerelle à la boucle locale (loopback) à l'intérieur du pod. Cela fonctionne avec `kubectl port-forward`, mais cela ne fonctionne pas avec un `Service` Kubernetes ou un chemin Ingress qui doit atteindre l'IP du pod.

Si vous souhaitez exposer la passerelle via un Ingress ou un équilibreur de charge :

- Modifiez la liaison de la passerelle dans `scripts/k8s/manifests/configmap.yaml` de `loopback` à une liaison non boucle locale qui correspond à votre modèle de déploiement
- Gardez l'authentification de la passerelle activée et utilisez un point d'entrée correctement terminé par TLS
- Configurez l'interface de contrôle pour l'accès à distance en utilisant le modèle de sécurité Web pris en charge (par exemple HTTPS/Tailscale Serve et des origines autorisées explicites si nécessaire)

## Redéployer

```bash
./scripts/k8s/deploy.sh
```

Cela applique tous les manifestes et redémarre le pod pour prendre en compte les modifications de configuration ou de secret.

## Démantèlement

```bash
./scripts/k8s/deploy.sh --delete
```

Cela supprime l'espace de noms et toutes les ressources qu'il contient, y compris le PVC.

## Notes sur l'architecture

- La passerelle se lie à la boucle locale à l'intérieur du pod par défaut, donc la configuration incluse est pour `kubectl port-forward`
- Aucune ressource à portée de cluster — tout vit dans un seul espace de noms
- Sécurité : `readOnlyRootFilesystem`, capacités `drop: ALL`, utilisateur non root (UID 1000)
- La configuration par défaut garde l'interface de contrôle sur le chemin d'accès local plus sûr : liaison boucle locale plus `kubectl port-forward` vers `http://127.0.0.1:18789`
- Si vous allez au-delà de l'accès localhost, utilisez le modèle distant pris en charge : HTTPS/Tailscale ainsi que les liaisons de passerelle appropriées et les paramètres d'origine de l'interface de contrôle
- Les secrets sont générés dans un répertoire temporaire et appliqués directement au cluster — aucune donnée secrète n'est écrite dans l'extraction du dépôt

## Structure des fichiers

```
scripts/k8s/
├── deploy.sh                   # Creates namespace + secret, deploys via kustomize
├── create-kind.sh              # Local Kind cluster (auto-detects docker/podman)
└── manifests/
    ├── kustomization.yaml      # Kustomize base
    ├── configmap.yaml          # openclaw.json + AGENTS.md
    ├── deployment.yaml         # Pod spec with security hardening
    ├── pvc.yaml                # 10Gi persistent storage
    └── service.yaml            # ClusterIP on 18789
```

import fr from '/components/footer/fr.mdx';

<fr />
