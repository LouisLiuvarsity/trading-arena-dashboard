# Trading Arena Dashboard — 环境变量配置文档

## 线上服务地址

| 服务 | 地址 |
|------|------|
| Arena 主站 | https://www.genfi.world |
| Arena API 基础路径 | https://www.genfi.world/api |
| Health Check | https://www.genfi.world/api/health |

## 管理员账户

| 字段 | 值 |
|------|------|
| ID | 30001 |
| 用户名 | Louis123 |
| 密码 | louis001226! |
| 角色 | admin |
| 初始资金 | 5000 USDT |

## `.env` 文件配置

在项目根目录创建 `.env` 文件，内容如下：

```env
# ====== 数据库 ======
DATABASE_URL=mysql://用户名:密码@数据库地址:3306/数据库名

# ====== OAuth 认证（看板自身登录） ======
VITE_APP_ID=你的AppID
OAUTH_SERVER_URL=OAuth服务器地址
JWT_SECRET=JWT密钥
OWNER_OPEN_ID=管理员OpenID

# ====== Arena 服务器连接（比赛/赛季管理） ======
ARENA_API_URL=https://www.genfi.world
ARENA_ADMIN_USERNAME=Louis123
ARENA_ADMIN_PASSWORD=louis001226!
```

## 环境变量说明

### 必须配置

| 变量名 | 用途 | 示例 |
|--------|------|------|
| `DATABASE_URL` | MySQL 数据库连接（与 Arena 共享同一个库） | `mysql://root:pass@127.0.0.1:3306/trading_arena` |
| `JWT_SECRET` | 看板 session token 签名密钥 | 任意长随机字符串 |
| `ARENA_API_URL` | Arena 服务器地址 | `https://www.genfi.world` |
| `ARENA_ADMIN_USERNAME` | Arena 管理员用户名 | `Louis123` |
| `ARENA_ADMIN_PASSWORD` | Arena 管理员密码 | `louis001226!` |

### 可选配置

| 变量名 | 用途 | 默认值 |
|--------|------|--------|
| `VITE_APP_ID` | Manus OAuth 应用 ID | 空 |
| `OAUTH_SERVER_URL` | Manus OAuth 服务器地址 | 空 |
| `OWNER_OPEN_ID` | 自动授予 admin 角色的 OpenID | 空 |
| `PORT` | 看板服务端口 | 3000 |
| `NODE_ENV` | 运行环境 | development |

## API 调用链路

```
看板前端 (React)
  ↓ tRPC (HTTP batch)
看板后端 (Express + tRPC)
  ├── 读操作 → 直接查 MySQL（DATABASE_URL）
  └── 写操作（创建赛季/比赛/状态变更）→ 直接写 MySQL
      状态流转/复制 → 调 Arena REST API（ARENA_API_URL + Bearer Token）
```

## Arena 关键 API 端点

| 操作 | 方法 | 端点 |
|------|------|------|
| 登录获取 Token | POST | `/api/auth/quick-login` |
| 创建赛季 | POST | `/api/admin/seasons` |
| 创建比赛 | POST | `/api/admin/competitions` |
| 更新比赛 | PUT | `/api/admin/competitions/:id` |
| 状态流转 | POST | `/api/admin/competitions/:id/transition` |
| 复制比赛 | POST | `/api/admin/competitions/:id/duplicate` |
| 审核报名 | POST | `/api/admin/registrations/:id/review` |
| 批量审核 | POST | `/api/admin/competitions/:id/registrations/batch` |

## 注意事项

- `.env` 包含密码，**不要提交到 Git**，确保 `.gitignore` 中有 `.env`
- `DATABASE_URL` 必须和 Arena 服务器连的是**同一个数据库**
- Arena 管理员账号的 `role` 必须为 `admin`（在 `arena_accounts` 表中）
- Token 会自动缓存，401 时自动重新登录
