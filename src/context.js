const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

const parseCookie = (str = '') =>
  str
    ? str
        .split(';')
        .map(v => v.split('='))
        .reduce((acc, v) => {
          acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
          return acc;
        }, {})
    : {};

async function createContext ({ req, res }) {
  const context = {
    request: req,
    response: res,
    prisma,
  };
  const { accessToken = '', refreshToken = '' } = parseCookie(req.headers.cookie);
  if (accessToken) {
    let decoded = await jwt.decode(accessToken.trim(), process.env.ACCESS_TOKEN_SECRET);
    if (decoded) {
      if (refreshToken) {
        context.currentUser = decoded;
      }
    }
  }
  return context;
}

module.exports = {
  createContext,
};
