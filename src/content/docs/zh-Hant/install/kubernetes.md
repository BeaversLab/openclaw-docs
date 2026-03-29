---
summary: "使用 Kustomize 將 OpenClaw Gateway 部署到 Kubernetes 叢集"
read_when:
  - You want to run OpenClaw on a Kubernetes cluster
  - You want to test OpenClaw in a Kubernetes environment
title: "Kubernetes"
---

# 在 Kubernetes 上執行 OpenClaw

在 Kubernetes 上執行 OpenClaw 的最小起點 — 並非可用於生產環境的部署。它涵蓋了核心資源，旨在適應您的環境。

## 為什麼不使用 Helm？

OpenClaw 是一個帶有一些配置檔案的單一容器。有趣的客製化在於代理程式內容（markdown 檔案、技能、配置覆蓋），而非基礎設施範本。Kustomize 可在沒有 Helm chart 開銷的情況下處理疊加層。如果您的部署變得更複雜，可以在這些清單之上疊加 Helm chart。

## 您需要什麼

- 一個正在執行的 Kubernetes 叢集 (AKS, EKS, GKE, k3s, kind, OpenShift 等)
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

取得 Gateway Token 並將其貼上到控制 UI：

```bash
kubectl get secret openclaw-secrets -n openclaw -o jsonpath='{.data.OPENCLAW_GATEWAY_TOKEN}' | base64 -d
```

對於本地除錯，`./scripts/k8s/deploy.sh --show-token` 會在部署後印出 token。

## 使用 Kind 進行本地測試

如果您沒有叢集，請使用 [Kind](https://kind.sigs.k8s.io/) 在本地建立一個：

```bash
./scripts/k8s/create-kind.sh           # auto-detects docker or podman
./scripts/k8s/create-kind.sh --delete  # tear down
```

然後照常使用 `./scripts/k8s/deploy.sh` 進行部署。

## 逐步操作

### 1) 部署

**選項 A** — API 金鑰在環境變數中（一個步驟）：

```bash
# Replace with your provider: ANTHROPIC, GEMINI, OPENAI, or OPENROUTER
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh
```

該腳本會使用 API 金鑰和自動產生的 Gateway Token 建立 Kubernetes Secret，然後進行部署。如果 Secret 已存在，它將保留目前的 Gateway Token 和任何未被變更的供應商金鑰。

**選項 B** — 分別建立 Secret：

```bash
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh --create-secret
./scripts/k8s/deploy.sh
```

如果您希望將 token 輸出到 stdout 以進行本地測試，請將 `--show-token` 與任一指令搭配使用。

### 2) 存取 Gateway

```bash
kubectl port-forward svc/openclaw 18789:18789 -n openclaw
open http://localhost:18789
```

## 會部署什麼

```
Namespace: openclaw (configurable via OPENCLAW_NAMESPACE)
├── Deployment/openclaw        # Single pod, init container + gateway
├── Service/openclaw           # ClusterIP on port 18789
├── PersistentVolumeClaim      # 10Gi for agent state and config
├── ConfigMap/openclaw-config  # openclaw.json + AGENTS.md
└── Secret/openclaw-secrets    # Gateway token + API keys
```

## 客製化

### 代理程式指令

編輯 `scripts/k8s/manifests/configmap.yaml` 中的 `AGENTS.md` 並重新部署：

```bash
./scripts/k8s/deploy.sh
```

### Gateway 配置

編輯 `scripts/k8s/manifests/configmap.yaml` 中的 `openclaw.json`。請參閱 [Gateway configuration](/en/gateway/configuration) 以獲得完整參考。

### 新增供應商

匯出額外的金鑰後重新執行：

```bash
export ANTHROPIC_API_KEY="..."
export OPENAI_API_KEY="..."
./scripts/k8s/deploy.sh --create-secret
./scripts/k8s/deploy.sh
```

除非您覆蓋現有的供應商金鑰，否則它們會保留在 Secret 中。

或直接修補 Secret：

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

編輯 `image` 欄位於 `scripts/k8s/manifests/deployment.yaml` 中：

```yaml
image: ghcr.io/openclaw/openclaw:latest # or pin to a specific version from https://github.com/openclaw/openclaw/releases
```

### 超越 Port Forward 的暴露

預設清單將 gateway 繫結到 Pod 內部的 loopback。這適用於 `kubectl port-forward`，但不適用於需要到達 Pod IP 的 Kubernetes `Service` 或 Ingress 路徑。

如果您想透過 Ingress 或負載平衡器暴露 gateway：

- 將 `scripts/k8s/manifests/configmap.yaml` 中的 gateway 繫結從 `loopback` 更改為符合您部署模型的非 loopback 繫結
- 保持啟用 gateway 驗證並使用適當的 TLS 終止入口
- 使用支援的 Web 安全模型設定 Control UI 以進行遠端存取（例如 HTTPS/Tailscale Serve 以及必要的明確允許來源）

## 重新部署

```bash
./scripts/k8s/deploy.sh
```

這會套用所有清單並重新啟動 Pod，以套用任何設定或 Secret 的變更。

## 拆除

```bash
./scripts/k8s/deploy.sh --delete
```

這會刪除命名空間及其中的所有資源，包括 PVC。

## 架構備註

- Gateway 預設會繫結到 Pod 內部的 loopback，因此包含的設定是用於 `kubectl port-forward`
- 沒有叢集範圍的資源 — 所有資源都位於單一命名空間中
- 安全性：`readOnlyRootFilesystem`、`drop: ALL` 能力、非 root 使用者（UID 1000）
- 預設設定將 Control UI 保持在較安全的本機存取路徑：loopback 繫結加上 `kubectl port-forward` 到 `http://127.0.0.1:18789`
- 如果您超越本地主機存取，請使用支援的遠端模型：HTTPS/Tailscale 加上適當的 gateway 繫結和 Control UI 來源設定
- Secrets 是在暫存目錄中產生的，並直接套用到叢集 — 不會將任何 Secret 資料寫入 repo checkout

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
