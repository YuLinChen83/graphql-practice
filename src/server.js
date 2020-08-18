const { ApolloServer } = require('apollo-server');
const dotenv = require('dotenv/config');
const { createContext } = require('./context');
const { typeDefs } = require('./typeDefs');
const { resolvers } = require('./resolvers');

const server = new ApolloServer({ typeDefs, resolvers, context: createContext });
server.listen({ port: 4400 }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
