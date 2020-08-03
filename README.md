# Singple Backend
> GraphQL server (SDL-first) with Node.js

`npm install -g @prisma/cli`

## How to use

### 1. Install

```
npm install
```

Note that this also generates Prisma Client JS into `node_modules/@prisma/client` via a `postinstall` hook of the `@prisma/client` package from your `package.json`.

### 2. Start the GraphQL server

Launch your GraphQL server with this command:

```
npm run dev
```

## Evolving the app

Evolving the application typically requires four subsequent steps:

1. Migrating the database schema using SQL
1. Update your Prisma schema by introspecting the database with `npx prisma introspect`
  The `introspect` command updates your `schema.prisma` file.
2. Generating Prisma Client to match the new database schema with `npx prisma generate`
3. Use the updated Prisma Client in your application code