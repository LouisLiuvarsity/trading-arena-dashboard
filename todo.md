# Trading Arena Dashboard 升级计划

## Phase 1: 升级全栈架构
- [x] 使用 webdev_add_feature 升级为 web-db-user
- [x] 分析 Trading Arena 原始数据库 schema
- [x] 设计后端 API 路由结构

## Phase 2: 后端 API 路由
- [x] 用户管理 API（列表、详情、封禁/解封、搜索筛选）
- [x] 比赛管理 API（列表、报名管理、批量审批）
- [x] 聊天管理 API（消息列表、隐藏/删除/恢复、批量操作）
- [x] 统计分析 API（段位分布、比赛趋势、排行榜、用户画像）

## Phase 3: 操作日志模块
- [x] 创建 admin_logs 数据库表
- [x] 创建日志记录 API
- [x] 在所有管理操作中自动记录日志
- [x] 创建操作日志前端页面（时间线展示、筛选、搜索）

## Phase 4: CSV 导出功能
- [x] 用户列表导出 CSV
- [x] 比赛数据导出 CSV
- [x] 统计报表导出 CSV
- [x] 操作日志导出 CSV

## Phase 5: 前端重构
- [x] 移除 mock-data.ts 依赖，改用 API 调用
- [x] 所有页面接入真实 API（loading/error 状态处理）
- [x] 添加操作日志页面到侧边栏导航
- [x] 添加导出按钮到各页面

## Phase 6: 测试
- [x] 32 个 vitest 测试全部通过（权限控制 + API 功能 + 输入验证）
