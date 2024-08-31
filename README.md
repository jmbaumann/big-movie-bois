# Monorepo

Next.js, React Native, trpc, Tailwind, Prisma

# Repo

```
.github
  └─ workflows
        └─ CI with pnpm cache setup
.vscode
  └─ Recommended extensions and settings for VSCode users
apps
  ├─ expo
  |   └─ React native mobile app
  └─ next.js
      └─ web app
packages
  ├─ api
      ├─ tRPC v10 router definition
      └─ wsServer - websocket server    TODO: move this to separate package
  ├─ auth
      └─ authentication using next-auth. **NOTE: Only for Next.js app, not Expo**
  └─ db
      └─ typesafe db-calls using Prisma
```
