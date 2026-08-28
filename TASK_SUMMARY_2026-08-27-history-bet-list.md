# LuckyGo H5 开奖历史投注清单作业总结

日期：2026-08-27

## 完成内容

- 开奖卡片头部调整为三层信息：第一行商品标题；第二行左右显示期号和开奖时间；第三行左右显示 `Lucky Number` 和号码值。
- 保留当前折叠按钮，展开后同时显示幸运用户和其他参与用户投注清单。
- 新增公开历史接口投注明细聚合：按活动、用户和下注时间统计下注份数。
- 清单排除幸运用户，仅展示其他参与用户。
- 手机号按加纳本地号前 2 位 + `****` + 后 3 位脱敏，例如 `02****165`。
- 清单展示手机号、下注时间、下注份数三列；前端统一显示 `yyyy-mm-dd hh:mm:ss`。
- 兼容无其他参与者的历史活动，显示空状态，不影响原开奖记录展示。
- 未删除或修改既有数据库表字段，仅读取现有 `lottery_numbers` 和 `users` 数据。

## 涉及文件

- `luckygo-server/src/history/history.service.ts`
- `luckygo-h5-new/src/pages/History.tsx`
- `luckygo-h5-new/src/types.ts`
- `luckygo-h5-new/src/i18n/en.ts`
- `luckygo-h5-new/src/i18n/zh.ts`

## 验证结果

- H5 `npm run build`：通过。
- H5 `npm run lint`：通过。
- 后端 `npm run build`：通过。
- 已复测 `/api/history`，投注清单返回脱敏手机号、下注时间和份数。

