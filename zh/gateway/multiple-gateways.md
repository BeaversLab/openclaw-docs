---
summary: "在同一主机运行多个 OpenClaw Gateway（隔离、端口与 profiles）"
read_when:
  - 在同一机器运行多个 Gateway
  - 需要为每个 Gateway 隔离 config/state/端口
---
# Multiple Gateways（同一主机）

多数场景应使用单个 Gateway，因为一个 Gateway 可处理多个消息连接与 agents。若需要更强隔离或冗余（例如救援 bot），请使用隔离 profile/端口运行多个 Gateway。

## 隔离检查清单（必需）
- `OPENCLAW_CONFIG_PATH` — 每实例配置文件
- `OPENCLAW_STATE_DIR` — 每实例 sessions、creds、缓存
- `agents.defaults.workspace` — 每实例 workspace 根
- `gateway.port`（或 `--port`）— 每实例唯一端口
- 派生端口（browser/canvas）不得重叠

若共享，会发生配置竞争与端口冲突。

## 推荐：profiles（`--profile`）

Profiles 会自动作用域 `OPENCLAW_STATE_DIR` + `OPENCLAW_CONFIG_PATH`，并为服务名添加后缀。

```bash
# main
openclaw --profile main setup
openclaw --profile main gateway --port 18789

# rescue
openclaw --profile rescue setup
openclaw --profile rescue gateway --port 19001
```

按 profile 安装服务：
```bash
openclaw --profile main gateway install
openclaw --profile rescue gateway install
```

## 救援 bot 指南

在同一主机上运行第二个 Gateway，并拥有独立的：
- profile/config
- state dir
- workspace
- 基础端口（以及派生端口）

这样救援 bot 与主 bot 隔离，当主 bot 挂掉时可用于排障或应用配置变更。

端口间隔：基础端口至少相差 20，以保证派生的 browser/canvas/CDP 端口不冲突。

### 安装方式（救援 bot）

```bash
# 主 bot（已存在或新建，不带 --profile）
# 运行在 18789 + Chrome CDC/Canvas/... 端口
openclaw onboard
openclaw gateway install

# 救援 bot（隔离 profile + 端口）
openclaw --profile rescue onboard
# Notes:
# - workspace 默认会追加 -rescue 后缀
# - 端口应至少 18789 + 20，
#   更推荐选完全不同的基础端口，如 19789
# - 其余 onboarding 与常规一致

# 安装服务（若 onboarding 未自动完成）
openclaw --profile rescue gateway install
```

## 端口映射（派生）

基础端口 = `gateway.port`（或 `OPENCLAW_GATEWAY_PORT` / `--port`）。

- 浏览器控制服务端口 = base + 2（仅 loopback）
- `canvasHost.port = base + 4`
- 浏览器 profile CDP 端口从 `browser.controlPort + 9 .. + 108` 自动分配

若在 config 或 env 中覆盖这些端口，必须确保每实例唯一。

## Browser/CDP 注意事项（常见踩坑）

- 不要在多个实例中将 `browser.cdpUrl` 固定到相同值。
- 每个实例需独立的浏览器控制端口与 CDP 区间（由 gateway 端口派生）。
- 若需显式 CDP 端口，为每个实例设置 `browser.profiles.<name>.cdpPort`。
- 远程 Chrome：使用 `browser.profiles.<name>.cdpUrl`（按 profile、按实例设置）。

## 手动 env 示例

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/main.json \
OPENCLAW_STATE_DIR=~/.openclaw-main \
openclaw gateway --port 18789

OPENCLAW_CONFIG_PATH=~/.openclaw/rescue.json \
OPENCLAW_STATE_DIR=~/.openclaw-rescue \
openclaw gateway --port 19001
```

## 快速检查

```bash
openclaw --profile main status
openclaw --profile rescue status
openclaw --profile rescue browser status
```
