---
summary: "使用 Kustomize 将 OpenClaw Gateway(网关) 部署到 Kubernetes 集群"
read_when:
  - 您想要在 Kubernetes 集群上运行 OpenClaw
  - 您想要在 Kubernetes 环境中测试 OpenClaw
title: "Kubernetes"
---

# Kubernetes 上的 OpenClaw

在 Kubernetes 上运行 OpenClaw 的一个最小起点——并非生产就绪的部署。它涵盖了核心资源，旨在适应您的环境。

## 为什么不使用 Helm？

OpenClaw 是一个带有一些配置文件的单容器。有趣的自定义在于 Agent 内容（markdown 文件、技能、配置覆盖），而不是基础架构模板。Kustomize 处理覆盖层，而无需 Helm chart 的开销。如果您的部署变得更加复杂，可以在此类清单之上添加 Helm chart。

## 您需要什么

- 一个正在运行的 Kubernetes 集群（AKS、EKS、GKE、k3s、kind、OpenShift 等）
- 已连接到您集群的 `kubectl`
- 至少一个模型提供商的 API 密钥

## 快速开始

```bash
# Replace with your provider: ANTHROPIC, GEMINI, OPENAI, or OPENROUTER
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh

kubectl port-forward svc/openclaw 18789:18789 -n openclaw
open http://localhost:18789
```

获取网关令牌并将其粘贴到控制 UI 中：

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

## 分步指南

### 1) 部署

**选项 A** — 环境中的 API 密钥（一步完成）：

```bash
# Replace with your provider: ANTHROPIC, GEMINI, OPENAI, or OPENROUTER
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh
```

该脚本使用 API 密钥和自动生成的网关令牌创建一个 Kubernetes Secret，然后进行部署。如果 Secret 已存在，它将保留当前的网关令牌以及任何未更改的提供商密钥。

**选项 B** — 单独创建密钥：

```bash
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh --create-secret
./scripts/k8s/deploy.sh
```

如果您希望将令牌打印到标准输出以进行本地测试，请将 `--show-token` 与任一命令一起使用。

### 2) 访问网关

```bash
kubectl port-forward svc/openclaw 18789:18789 -n openclaw
open http://localhost:18789
```

## 部署的内容

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

### Gateway(网关) 配置

编辑 `scripts/k8s/manifests/configmap.yaml` 中的 `openclaw.json`。有关完整参考，请参阅 [Gateway(网关) 配置](/zh/gateway/configuration)。

### 添加提供商

导出其他密钥后重新运行：

```bash
export ANTHROPIC_API_KEY="..."
export OPENAI_API_KEY="..."
./scripts/k8s/deploy.sh --create-secret
./scripts/k8s/deploy.sh
```

现有的提供商密钥保留在 Secret 中，除非您覆盖它们。

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
image: ghcr.io/openclaw/openclaw:2026.3.1
```

### 超越端口转发进行暴露

默认清单将网关绑定到 Pod 内部的环回地址。这适用于 `kubectl port-forward`，但不适用于需要访问 Pod IP 的 Kubernetes `Service` 或 Ingress 路径。

如果您想通过 Ingress 或负载均衡器暴露网关：

- 将 `scripts/k8s/manifests/configmap.yaml` 中的网关绑定从 `loopback` 更改为与您的部署模型匹配的非环回绑定
- 保持网关身份验证处于启用状态，并使用适当的 TLS 终止入口点
- 使用支持的 Web 安全模型（例如 HTTPS/Tailscale Serve 以及必要时明确的允许来源）配置控制 UI 以进行远程访问

## 重新部署

```bash
./scripts/k8s/deploy.sh
```

这将应用所有清单并重启 Pod，以获取任何配置或密钥的更改。

## 拆除

```bash
./scripts/k8s/deploy.sh --delete
```

这将删除命名空间及其中的所有资源，包括 PVC。

## 架构说明

- 默认情况下，网关绑定到 Pod 内部的环回地址，因此包含的设置是用于 `kubectl port-forward` 的
- 没有集群范围的资源——所有资源都位于单个命名空间中
- 安全性：`readOnlyRootFilesystem`，`drop: ALL` 功能，非 root 用户 (UID 1000)
- 默认配置将控制 UI 保持在更安全的本地访问路径上：环回绑定加上 `kubectl port-forward` 到 `http://127.0.0.1:18789`
- 如果您超越本地主机访问，请使用支持的远程模型：HTTPS/Tailscale 以及适当的网关绑定和控制 UI 源设置
- 密钥在临时目录中生成并直接应用到集群——没有密钥材料写入到代码仓库检出中

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

import en from "/components/footer/en.mdx";

<en />
