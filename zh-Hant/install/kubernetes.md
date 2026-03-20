---
summary: "使用 Kustomize 將 OpenClaw Gateway 部署到 Kubernetes 叢集"
read_when:
  - 您希望在 Kubernetes 叢集上執行 OpenClaw
  - 您希望在 Kubernetes 環境中測試 OpenClaw
title: "Kubernetes"
---

# 在 Kubernetes 上執行 OpenClaw

在 Kubernetes 上執行 OpenClaw 的最小起點 — 並非可用於生產環境的部署。它涵蓋了核心資源，旨在適應您的環境。

## 為什麼不使用 Helm？

OpenClaw 是一個單一容器，包含一些設定檔。有趣的客製化在於 Agent 內容（markdown 檔案、技能、設定覆蓋），而非基礎架構範本。Kustomize 處理疊加層時，沒有 Helm chart 的額外負擔。如果您的部署變得更複雜，可以將 Helm chart 分層疊加在這些清單之上。

## 您需要什麼

- 一個執行中的 Kubernetes 叢集（AKS、EKS、GKE、k3s、kind、OpenShift 等）
- `kubectl` 已連線到您的叢集
- 至少一個模型供應商的 API 金鑰

## 快速開始

```bash
# Replace with your provider: ANTHROPIC, GEMINI, OPENAI, or OPENROUTER
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh

kubectl port-forward svc/openclaw 18789:18789 -n openclaw
open http://localhost:18789
```

取得 gateway token 並將其貼上至 Control UI：

```bash
kubectl get secret openclaw-secrets -n openclaw -o jsonpath='{.data.OPENCLAW_GATEWAY_TOKEN}' | base64 -d
```

對於本機除錯，`./scripts/k8s/deploy.sh --show-token` 會在部署後列印 token。

## 使用 Kind 進行本機測試

如果您沒有叢集，請使用 [Kind](https://kind.sigs.k8s.io/) 在本機建立一個：

```bash
./scripts/k8s/create-kind.sh           # auto-detects docker or podman
./scripts/k8s/create-kind.sh --delete  # tear down
```

然後照常使用 `./scripts/k8s/deploy.sh` 進行部署。

## 逐步操作

### 1) 部署

**選項 A** — 在環境變數中使用 API 金鑰（一個步驟）：

```bash
# Replace with your provider: ANTHROPIC, GEMINI, OPENAI, or OPENROUTER
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh
```

該腳本會使用 API 金鑰和自動產生的 gateway token 建立 Kubernetes Secret，然後進行部署。如果 Secret 已存在，它將保留目前的 gateway token 和任何未變更的供應商金鑰。

**選項 B** — 分別建立 secret：

```bash
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh --create-secret
./scripts/k8s/deploy.sh
```

如果您希望將 token 列印到 stdout 以進行本機測試，請在任一指令中使用 `--show-token`。

### 2) 存取 gateway

```bash
kubectl port-forward svc/openclaw 18789:18789 -n openclaw
open http://localhost:18789
```

## 部署了什麼

```
Namespace: openclaw (configurable via OPENCLAW_NAMESPACE)
├── Deployment/openclaw        # Single pod, init container + gateway
├── Service/openclaw           # ClusterIP on port 18789
├── PersistentVolumeClaim      # 10Gi for agent state and config
├── ConfigMap/openclaw-config  # openclaw.json + AGENTS.md
└── Secret/openclaw-secrets    # Gateway token + API keys
```

## 客製化

### Agent 指示

編輯 `AGENTS.md` 中的 `scripts/k8s/manifests/configmap.yaml` 並重新部署：

```bash
./scripts/k8s/deploy.sh
```

### Gateway 設定

編輯 `scripts/k8s/manifests/configmap.yaml` 中的 `openclaw.json`。完整參考請參閱 [Gateway configuration](/zh-Hant/gateway/configuration)。

### 新增供應商

匯出額外的金鑰後重新執行：

```bash
export ANTHROPIC_API_KEY="..."
export OPENAI_API_KEY="..."
./scripts/k8s/deploy.sh --create-secret
./scripts/k8s/deploy.sh
```

現有的供應商金鑰會保留在 Secret 中，除非您覆寫它們。

或是直接修補 Secret：

```bash
kubectl patch secret openclaw-secrets -n openclaw \
  -p '{"stringData":{"<PROVIDER>_API_KEY":"..."}}'
kubectl rollout restart deployment/openclaw -n openclaw
```

### 自訂命名空間

```bash
OPENCLAW_NAMESPACE=my-namespace ./scripts/k8s/deploy.sh
```

### 自訂映像檔

編輯 `image` 欄位於 `scripts/k8s/manifests/deployment.yaml`：

```yaml
image: ghcr.io/openclaw/openclaw:2026.3.1
```

### 超越 port-forward 暴露服務

預設的清單會將閘道繫結到 Pod 內的 loopback 介面。這與 `kubectl port-forward` 搭配運作良好，但對於需要連接到 Pod IP 的 Kubernetes `Service` 或 Ingress 路徑則無法運作。

如果您想透過 Ingress 或負載平衡器暴露閘道：

- 將 `scripts/k8s/manifests/configmap.yaml` 中的閘道繫結從 `loopback` 更改為符合您部署模式的非 loopback 繫結
- 保持啟用閘道身份驗證並使用適當的 TLS 終端入口點
- 使用支援的網路安全模型（例如 HTTPS/Tailscale Serve 以及必要的明確允許來源）設定控制 UI 以進行遠端存取

## 重新部署

```bash
./scripts/k8s/deploy.sh
```

這會套用所有清單並重啟 Pod，以套用任何設定或 Secret 的變更。

## 拆除

```bash
./scripts/k8s/deploy.sh --delete
```

這會刪除命名空間及其中的所有資源，包括 PVC。

## 架構備註

- 閘道預設會繫結到 Pod 內的 loopback，因此包含的設定是針對 `kubectl port-forward`
- 沒有叢集範圍的資源 — 所有資源都位於單一命名空間中
- 安全性：`readOnlyRootFilesystem`、`drop: ALL` 功能、非 root 使用者 (UID 1000)
- 預設設定會將控制 UI 保持在較安全的本機存取路徑：loopback 繫結加上 `kubectl port-forward` 到 `http://127.0.0.1:18789`
- 如果您超越本機 存取，請使用支援的遠端模型：HTTPS/Tailscale 加上適當的閘道繫結和控制 UI 來源設定
- Secret 會在暫存目錄中產生並直接套用到叢集 — 不會將任何 Secret 寫入到 repo checkout

## 檔案結構

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

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
