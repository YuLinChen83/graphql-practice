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
  const cookies = parseCookie(req.headers.cookie);
  const { accessToken, refreshToken } = cookies;
  const context = {
    request: req,
    response: res,
    prisma,
  };
  let decoded = await jwt.decode(accessToken, process.env.ACCESS_TOKEN_SECRET);
  if (!decoded) {
    if (refreshToken) {
      context.currentUser = decoded || null;
    }
  }
  return context;
}

module.exports = {
  createContext,
};
