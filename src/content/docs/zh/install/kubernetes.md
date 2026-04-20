---
summary: "使用 Kustomize 将 OpenClaw Gateway(网关) 网关 部署到 Kubernetes 集群"
read_when:
  - You want to run OpenClaw on a Kubernetes cluster
  - You want to test OpenClaw in a Kubernetes environment
title: "Kubernetes"
---

# Kubernetes 上的 OpenClaw

在 Kubernetes 上运行 OpenClaw 的一个最低起点——并非可用于生产环境的部署。它涵盖了核心资源，旨在根据您的环境进行调整。

## 为什么不用 Helm？

OpenClaw 是一个带有一些配置文件的单容器。有趣的定制在于代理内容（markdown 文件、技能、配置覆盖），而不是基础架构模板。Kustomize 无需 Helm chart 的开销即可处理叠加层。如果您的部署变得更加复杂，可以在这些清单之上分层 Helm chart。

## 您需要什么

- 一个正在运行的 Kubernetes 集群（AKS、EKS、GKE、k3s、kind、OpenShift 等）
- `kubectl` 已连接到您的集群
- 至少一个模型提供商的 API 密钥

## 快速入门

```bash
# Replace with your provider: ANTHROPIC, GEMINI, OPENAI, or OPENROUTER
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh

kubectl port-forward svc/openclaw 18789:18789 -n openclaw
open http://localhost:18789
```

检索为控制 UI 配置的共享密钥。此部署脚本默认创建令牌身份验证：

```bash
kubectl get secret openclaw-secrets -n openclaw -o jsonpath='{.data.OPENCLAW_GATEWAY_TOKEN}' | base64 -d
```

对于本地调试，`./scripts/k8s/deploy.sh --show-token` 会在部署后打印令牌。

## 使用 Kind 进行本地测试

如果您没有集群，请使用 [Kind](https://kind.sigs.k8s.io/) 在本地创建一个：

```bash
./scripts/k8s/create-kind.sh           # auto-detects docker or podman
./scripts/k8s/create-kind.sh --delete  # tear down
```

然后照常使用 `./scripts/k8s/deploy.sh` 进行部署。

## 分步说明

### 1) 部署

**选项 A** — API 密钥在环境中（一步到位）：

```bash
# Replace with your provider: ANTHROPIC, GEMINI, OPENAI, or OPENROUTER
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh
```

该脚本会使用 API 密钥和自动生成的网关令牌创建一个 Kubernetes Secret，然后进行部署。如果 Secret 已存在，它将保留当前的网关令牌以及任何未更改的提供商密钥。

**选项 B** — 单独创建 secret：

```bash
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh --create-secret
./scripts/k8s/deploy.sh
```

如果您希望令牌打印到标准输出以进行本地测试，请对任一命令使用 `--show-token`。

### 2) 访问网关

```bash
kubectl port-forward svc/openclaw 18789:18789 -n openclaw
open http://localhost:18789
```

## 部署内容

```
Namespace: openclaw (configurable via OPENCLAW_NAMESPACE)
├── Deployment/openclaw        # Single pod, init container + gateway
├── Service/openclaw           # ClusterIP on port 18789
├── PersistentVolumeClaim      # 10Gi for agent state and config
├── ConfigMap/openclaw-config  # openclaw.json + AGENTS.md
└── Secret/openclaw-secrets    # Gateway token + API keys
```

## 自定义

### Agent 指令

编辑 `scripts/k8s/manifests/configmap.yaml` 中的 `AGENTS.md` 并重新部署：

```bash
./scripts/k8s/deploy.sh
```

### Gateway(网关) 网关 配置

在 `scripts/k8s/manifests/configmap.yaml` 中编辑 `openclaw.json`。有关完整参考，请参阅 [Gateway(网关) 配置](/zh/gateway/configuration)。

### 添加提供商

导出额外的密钥后重新运行：

```bash
export ANTHROPIC_API_KEY="..."
export OPENAI_API_KEY="..."
./scripts/k8s/deploy.sh --create-secret
./scripts/k8s/deploy.sh
```

除非您覆盖它们，否则现有的提供商密钥将保留在 Secret 中。

或者直接修补 Secret：

```bash
kubectl patch secret openclaw-secrets -n openclaw \
  -p '{"stringData":{"<PROVIDER>_API_KEY":"..."}}'
kubectl rollout restart deployment/openclaw -n openclaw
```

### 自定义命名空间

```bash
OPENCLAW_NAMESPACE=my-namespace ./scripts/k8s/deploy.sh
```

### 自定义镜像

编辑 `scripts/k8s/manifests/deployment.yaml` 中的 `image` 字段：

```yaml
image: ghcr.io/openclaw/openclaw:latest # or pin to a specific version from https://github.com/openclaw/openclaw/releases
```

### 超越端口转发的暴露

默认清单将网关绑定到 Pod 内部的环回地址。这适用于 `kubectl port-forward`，但不适用于需要访问 Pod IP 的 Kubernetes `Service` 或 Ingress 路径。

如果您想通过 Ingress 或负载均衡器暴露网关：

- 将 `scripts/k8s/manifests/configmap.yaml` 中的网关绑定地址从 `loopback` 更改为符合您的部署模型的非环回绑定地址
- 保持网关身份验证已启用，并使用适当的 TLS 终止入口点
- 使用支持的 Web 安全模型（例如 HTTPS/Tailscale Serve 和必要时显式允许的源）配置控制 UI 以进行远程访问

## 重新部署

```bash
./scripts/k8s/deploy.sh
```

这将应用所有清单并重启 Pod 以获取任何配置或 Secret 的更改。

## 拆除

```bash
./scripts/k8s/deploy.sh --delete
```

这将删除命名空间及其中的所有资源，包括 PVC。

## 架构说明

- 默认情况下，网关绑定到 Pod 内部的环回地址，因此包含的设置是用于 `kubectl port-forward`
- 没有集群范围资源——所有资源都位于单个命名空间中
- 安全性：`readOnlyRootFilesystem`，`drop: ALL` 能力，非 root 用户（UID 1000）
- 默认配置将控制 UI 保持在更安全的本地访问路径上：环回绑定加上 `kubectl port-forward` 到 `http://127.0.0.1:18789`
- 如果您超出 localhost 访问范围，请使用受支持的远程模型：HTTPS/Tailscale 加上适当的网关绑定和控制 UI 源设置
- 机密是在临时目录中生成的，并直接应用到集群 —— 没有机密材料被写入到仓库检出目录

## 文件结构

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
