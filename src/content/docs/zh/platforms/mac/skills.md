---
summary: "macOS Skills 设置界面和网关支持的状态"
read_when:
  - Updating the macOS Skills settings UI
  - Changing skills gating or install behavior
title: "Skills (macOS)"
---

# Skills (macOS)

macOS 应用程序通过网关展示 OpenClaw skills；它不在本地解析 skills。

## 数据源

- `skills.status` (gateway) 返回所有技能以及资格和缺失要求
  （包括捆绑技能的允许列表阻止）。
- 要求源自每个 `SKILL.md` 中的 `metadata.openclaw.requires`。

## 安装操作

- `metadata.openclaw.install` 定义了安装选项（brew/node/go/uv）。
- 应用程序调用 `skills.install` 在网关主机上运行安装程序。
- 内置的危险代码 `critical` 发现默认会阻止 `skills.install`；可疑发现仍仅发出警告。危险覆盖选项存在于网关请求中，但默认应用流程保持故障关闭（fail-closed）。
- 如果每个安装选项都是 `download`，网关将显示所有下载选项。
- 否则，网关会根据当前的安装首选项和宿主二进制文件选择一个首选安装程序：当启用 `skills.install.preferBrew` 且存在 `brew` 时首选 Homebrew，然后是 `uv`，接着是 `skills.install.nodeManager` 中配置的节点管理器，最后是 `go` 或 `download` 等后备选项。
- 节点安装标签反映了已配置的节点管理器，包括 `yarn`。

## Env/API keys

- 该应用程序将密钥存储在 `skills.entries.<skillKey>` 下的 `~/.openclaw/openclaw.json` 中。
- `skills.update` 会修补 `enabled`、`apiKey` 和 `env`。

## Remote mode

- 安装和配置更新发生在网关主机上（而不是本地 Mac 上）。
