const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

module.exports = {
  createContext: async req => {
    const { request } = req;
    const { accessToken, refreshToken } = request.cookies || {};
    if (!accessToken && !refreshToken) {
      return {
        ...req,
        prisma,
      };
    }
    let decoded = await jwt.decode(accessToken, process.env.ACCESS_TOKEN_SECRET);
    if (!decoded) {
      if (!refreshToken) {
        return {
          ...req,
          prisma,
        };
      }
      decoded = await jwt.decode(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    }
    return {
      ...req,
      currentUser: decoded || null,
      prisma,
      host: request.get('host'),
    };
  },
};
