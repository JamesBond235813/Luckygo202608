# Categories 商品数量不一致修复总结

日期：2026-09-01

## 问题

首页接口返回两个在售商品，但 Categories 默认选择 Phones 分类时只返回一个商品。

## 原因

数据库中商品 `products.id=27`（iPhone XR）的 `category_id` 为 `NULL`。Categories 页面按分类查询，Phones 分类 ID 为 `1`，因此该商品被正确地排除；首页查询不带分类条件，所以显示两个商品。

## 修复

- 新增幂等数据库迁移：`20260901_backfill_uncategorized_phone_product`。
- 将商品 `id=27` 关联到 `Phones` 分类（`category_id=1`）。
- 保留原有表和字段，不删除任何业务数据或逻辑。
- 迁移记录写入 `schema_migrations`，重复执行不会重复更新。

## 验证

- `npm run db:migrate`：通过，回填 1 行。
- 首页 `/api/campaigns`：返回 2 个商品。
- Phones 分类 `/api/campaigns?categoryId=1`：返回 2 个商品。
- 两个商品的分类 ID 均为 `1`。
- 服务端 `npm run build`：通过。

