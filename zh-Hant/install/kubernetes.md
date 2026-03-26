---
summary: "使用 Kustomize 將 OpenClaw Gateway 部署到 Kubernetes 叢集"
read_when:
  - You want to run OpenClaw on a Kubernetes cluster
  - You want to test OpenClaw in a Kubernetes environment
title: "Kubernetes"
---

# 在 Kubernetes 上執行 OpenClaw

在 Kubernetes 上執行 OpenClaw 的最低起點 — 這不是適用於生產環境的部署。它涵蓋了核心資源，並旨在根據您的環境進行調整。

## 為什麼不使用 Helm？

OpenClaw 是一個包含一些設定檔的單一容器。有趣的客製化內容在於代理程式內容（markdown 檔案、技能、設定覆寫），而非基礎架構範本。Kustomize 可在不增加 Helm 圖表開銷的情況下處理疊加層。如果您的部署變得更複雜，可以將 Helm 圖表疊加在這些清單之上。

## 您需要什麼

- 一個正在執行的 Kubernetes 叢集（AKS、EKS、GKE、k3s、kind、OpenShift 等）
- `kubectl` 已連線至您的叢集
- 至少一個模型供應商的 API 金鑰

## 快速開始

```bash
# Replace with your provider: ANTHROPIC, GEMINI, OPENAI, or OPENROUTER
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh

kubectl port-forward svc/openclaw 18789:18789 -n openclaw
open http://localhost:18789
```

擷取閘道 token 並將其貼上到控制 UI 中：

```bash
kubectl get secret openclaw-secrets -n openclaw -o jsonpath='{.data.OPENCLAW_GATEWAY_TOKEN}' | base64 -d
```

對於本機除錯，`./scripts/k8s/deploy.sh --show-token` 會在部署後印出 token。

## 使用 Kind 進行本機測試

如果沒有叢集，可以使用 [Kind](https://kind.sigs.k8s.io/) 在本地建立一個：

```bash
./scripts/k8s/create-kind.sh           # auto-detects docker or podman
./scripts/k8s/create-kind.sh --delete  # tear down
```

然後像平常一樣使用 `./scripts/k8s/deploy.sh` 進行部署。

## 逐步操作

### 1) 部署

**選項 A** — API 金鑰在環境變數中（一步驟）：

```bash
# Replace with your provider: ANTHROPIC, GEMINI, OPENAI, or OPENROUTER
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh
```

該腳本會使用 API 金鑰和自動產生的閘道 token 建立 Kubernetes Secret，然後進行部署。如果 Secret 已存在，它會保留目前的閘道 token 以及任何未變更的供應商金鑰。

**選項 B** — 分別建立 secret：

```bash
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh --create-secret
./scripts/k8s/deploy.sh
```

如果您希望將 token 印出到 stdout 以進行本機測試，請在任一指令中使用 `--show-token`。

### 2) 存取閘道

```bash
kubectl port-forward svc/openclaw 18789:18789 -n openclaw
open http://localhost:18789
```

## 部署內容

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

編輯 `scripts/k8s/manifests/configmap.yaml` 中的 `openclaw.json`。請參閱 [Gateway configuration](/zh-Hant/gateway/configuration) 以取得完整參考。

### 新增提供者

匯出額外的金鑰並重新執行：

```bash
export ANTHROPIC_API_KEY="..."
export OPENAI_API_KEY="..."
./scripts/k8s/deploy.sh --create-secret
./scripts/k8s/deploy.sh
```

除非您覆寫它們，否則現有的提供者金鑰會保留在 Secret 中。

或者直接修補 Secret：

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

編輯 `scripts/k8s/manifests/deployment.yaml` 中的 `image` 欄位：

```yaml
image: ghcr.io/openclaw/openclaw:latest # or pin to a specific version from https://github.com/openclaw/openclaw/releases
```

### 透過 port-forward 以外的方式公開

預設的 manifest 將 gateway 繫結到 Pod 內部的 loopback。這適用於 `kubectl port-forward`，但對於需要存取 Pod IP 的 Kubernetes `Service` 或 Ingress 路徑則無效。

如果您想透過 Ingress 或負載平衡器公開 gateway：

- 將 `scripts/k8s/manifests/configmap.yaml` 中的 gateway bind 從 `loopback` 更改為符合您部署模型的非 loopback bind
- 保持啟用 gateway auth 並使用適當的 TLS-terminated entrypoint
- 使用支援的網頁安全模型（例如 HTTPS/Tailscale Serve 以及必要的明確 allowed origins）設定 Control UI 以進行遠端存取

## 重新部署

```bash
./scripts/k8s/deploy.sh
```

這會套用所有 manifests 並重新啟動 pod 以獲取任何設定或 secret 的變更。

## 拆除

```bash
./scripts/k8s/deploy.sh --delete
```

這會刪除 namespace 及其中的所有資源，包括 PVC。

## 架構備註

- Gateway 預設在 pod 內部綁定到 loopback，因此包含的設定是用於 `kubectl port-forward`
- 沒有叢集範圍的資源 —— 所有資源都位於單一 namespace 中
- 安全性：`readOnlyRootFilesystem`、`drop: ALL` 功能、非 root 使用者 (UID 1000)
- 預設設定將控制 UI 保持在較安全的本機存取路徑上：迴路綁定加上 `kubectl port-forward` 到 `http://127.0.0.1:18789`
- 如果您超出本機存取範圍，請使用支援的遠端模型：HTTPS/Tailscale 加上適當的閘道綁定和控制 UI 來源設定
- 機密是在暫存目錄中產生的，並直接套用到叢集——不會將任何機密資料寫入存放庫簽出

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
