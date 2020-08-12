# Singple Backend

## Start the GraphQL server

1. `npm install -g @prisma/cli`
1. `npm install`
1. `docker-compose up -d`
1. Create MySQL Table (according to prisma/schema.prisma)
   1. `npx prisma migrate save --experimental`
   2. `npx prisma migrate up --experimental`
1. Update Prisma `npx prisma generate`
1. `npm run dev`
