---
summary: "针对静默最终预览编辑的每个接收者的 Matrix 推送规则"
read_when:
  - Setting up Matrix quiet streaming for self-hosted Synapse or Tuwunel
  - Users want notifications only on finished blocks, not on every preview edit
title: "针对静默预览的 Matrix 推送规则"
---

当 `channels.matrix.streaming` 为 `"quiet"` 时，OpenClaw 会原地编辑单个预览事件，并使用自定义内容标记标记最终编辑。仅当每个用户的推送规则匹配该标记时，Matrix 客户端才会通知最终编辑。本页面适用于自托管 Matrix 并希望为每个接收者帐户安装该规则的操作员。

如果您只需要标准的 Matrix 通知行为，请使用 `streaming: "partial"` 或保持流式传输关闭。请参阅 [Matrix 渠道设置](/zh/channels/matrix#streaming-previews)。

## 前提条件

- 接收者用户 = 应该接收通知的人
- 机器人用户 = 发送回复的 OpenClaw Matrix 帐户
- 对下方的 API 调用使用接收者用户的访问令牌
- 在推送规则中匹配 `sender` 以对应机器人用户的完整 MXID
- 接收者帐户必须已经拥有可用的推送器（pushers）—— 静默预览规则仅在正常的 Matrix 推送传递健康时才有效

## 步骤

<Steps>
  <Step title="配置静默预览">

```json5
{
  channels: {
    matrix: {
      streaming: "quiet",
    },
  },
}
```

  </Step>

  <Step title="获取接收者的访问令牌">
    尽可能重用现有的客户端会话令牌。要生成一个新的：

```bash
curl -sS -X POST \
  "https://matrix.example.org/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "m.login.password",
    "identifier": { "type": "m.id.user", "user": "@alice:example.org" },
    "password": "REDACTED"
  }'
```

  </Step>

  <Step title="验证推送器是否存在">

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushers"
```

如果没有返回任何推送器，请在继续之前修复此帐户的正常 Matrix 推送传递。

  </Step>

  <Step title="安装覆盖推送规则">
    OpenClaw 使用 `content["com.openclaw.finalized_preview"] = true` 标记最终的纯文本预览编辑。安装一个规则，以匹配该标记以及作为发送者的机器人 MXID：

```bash
curl -sS -X PUT \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "conditions": [
      { "kind": "event_match", "key": "type", "pattern": "m.room.message" },
      {
        "kind": "event_property_is",
        "key": "content.m\\.relates_to.rel_type",
        "value": "m.replace"
      },
      {
        "kind": "event_property_is",
        "key": "content.com\\.openclaw\\.finalized_preview",
        "value": true
      },
      { "kind": "event_match", "key": "sender", "pattern": "@bot:example.org" }
    ],
    "actions": [
      "notify",
      { "set_tweak": "sound", "value": "default" },
      { "set_tweak": "highlight", "value": false }
    ]
  }'
```

    运行前请替换：

    - `https://matrix.example.org`：您的主服务器基础 URL
    - `$USER_ACCESS_TOKEN`：接收用户的访问令牌
    - `openclaw-finalized-preview-botname`：一个针对每个机器人每个接收者唯一的规则 ID（模式：`openclaw-finalized-preview-<botname>`）
    - `@bot:example.org`：您的 OpenClaw 机器人 MXID，而不是接收者的

  </Step>

  <Step title="验证">

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

然后测试流式回复。在静默模式下，房间会显示静默草稿预览，并在区块或回合完成时通知一次。

  </Step>
</Steps>

要稍后删除该规则，请使用接收者的令牌对同一规则 URL 执行 `DELETE` 操作。

## 多机器人说明

推送规则由 `ruleId` 键控：针对同一 ID 重新运行 `PUT` 会更新单个规则。对于通知同一接收者的多个 OpenClaw 机器人，请为每个机器人创建一个具有不同发送者匹配条件的规则。

新的用户定义 `override` 规则会插入到默认的抑制规则之前，因此不需要额外的排序参数。该规则仅影响可以就地定稿的纯文本预览编辑；媒体回退和过时预览回退使用正常的 Matrix 传递方式。

## 主服务器说明

<AccordionGroup>
  <Accordion title="Synapse">
    不需要特殊的 `homeserver.yaml` 更改。如果正常的 Matrix 通知已经能到达此用户，那么接收者令牌 + 上述 `pushrules` 调用就是主要的设置步骤。

    如果你在反向代理或工作进程（worker）后面运行 Synapse，请确保 `/_matrix/client/.../pushrules/` 能正确到达 Synapse。推送交付由主进程或 `synapse.app.pusher` / 已配置的推送工作进程处理 —— 请确保它们运行正常。

    该规则使用 `event_property_is` 推送规则条件（MSC3758，推送规则 v1.10），该条件于 2023 年添加到 Synapse 中。较旧的 Synapse 版本接受 `PUT pushrules/...` 调用，但会默默地永远不会匹配该条件 —— 如果在完成的预览编辑上没有收到通知，请升级 Synapse。

  </Accordion>

  <Accordion title="Tuwunel">
    流程与 Synapse 相同；对于完成的预览标记，不需要特定的 Tuwunel 配置。

    如果当用户在另一台设备上处于活动状态时通知消失，请检查是否启用了 `suppress_push_when_active`。Tuwunel 在 1.4.2 版本（2025 年 9 月）中添加了此选项，它可以在一台设备处于活动状态时有目的地抑制向其他设备的推送。

  </Accordion>
</AccordionGroup>

## 相关

- [Matrix 渠道设置](/zh/channels/matrix)
- [流式传输概念](/zh/concepts/streaming)
