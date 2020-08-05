const { GraphQLServer } = require('graphql-yoga');
const { schema } = require('./schema');
const { createContext } = require('./context');
const { PrismaClient } = require('@prisma/client');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv/config');

const server = new GraphQLServer({
  schema,
  context: createContext,
});
const serverOptions = {
  port: process.env.PORT,
  cors: {
    credentials: true,
    origin: process.env.FRONTEND_URL,
  },
};
server.express.use(cookieParser());
server.start(serverOptions, postStart => {
  console.log(`🚀 Server ready at: http://localhost:${postStart.port}`);
});
