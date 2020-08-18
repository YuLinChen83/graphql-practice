const { ApolloServer } = require('apollo-server');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv/config');
const { createContext } = require('./context');
const { typeDefs } = require('./typeDefs');
const { resolvers } = require('./resolvers');

const server = new ApolloServer({ typeDefs, resolvers, context: createContext });
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});