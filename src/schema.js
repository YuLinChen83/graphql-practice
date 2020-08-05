const { makeExecutableSchema } = require('graphql-tools');
// const { importSchema } = require('graphql-import');
const path = require('path');
const { loadSchemaSync } = require('@graphql-tools/load');
const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader');
const { addResolversToSchema } = require('@graphql-tools/schema');
const { DateTimeResolver, DateResolver } = require('graphql-scalars');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-core');
const { combineResolvers, skip } = require('graphql-resolvers');
const { sendEmail } = require('./utils/email');

// const typeDefs = importSchema('src/schemas/schema.graphql');
const schema = loadSchemaSync(path.join(__dirname, 'schemas/schema.graphql'), {
  loaders: [new GraphQLFileLoader()],
});

const getWhereObject = search => {
  Object.keys(search).forEach(key => {
    search[key] = { contains: search[key] };
  });
  return search;
};

const createTokens = user => {
  const refreshToken = jwt.sign(
    { userId: user.id, count: user.count, role: user.role },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' },
  );
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: '15min',
    },
  );
  return { refreshToken, accessToken };
};

const isAuthenticated = async (parent, args, { prisma, currentUser, request }) => {
  if (currentUser) {
    const user = await prisma.user.findOne({
      where: {
        id: Number(currentUser.userId),
      },
    });
    if (user && user.role === currentUser.role) {
      return skip;
    }
  }
  return new AuthenticationError('未認證無法存取，請先登入');
};

const resolvers = {
  DateTime: DateTimeResolver,
  Date: DateResolver,
  Query: {
    currentUser: async (parent, args, { prisma, currentUser }) => {
      if (!currentUser || !currentUser.userId) {
        throw new AuthenticationError('當前未登入！請重新登錄');
      }
      return await prisma.user.findOne({ where: { id: currentUser.userId } });
    },
    users: combineResolvers(
      isAuthenticated,
      async (parent, { filter, skip, take, orderBy }, { prisma }) => {
        return await prisma.user.findMany({ where: filter || {}, skip, take, orderBy });
      },
    ),
    signIn: async (parent, { email, password }, { prisma, response, request }) => {
      const user = await prisma.user.findOne({ where: { email } });
      if (!user || !bcrypt.compareSync(password, user.password)) {
        throw new AuthenticationError('登入失敗：帳號或密碼錯誤');
      }
      const { accessToken, refreshToken } = createTokens(user);
      response.cookie('refreshToken', refreshToken, { httpOnly: true });
      response.cookie('accessToken', accessToken, { httpOnly: true });
      console.log(user);
      return true;
    },
    // course: (root, { name }) => {
    //   console.log('Course:', name);
    // },
  },
  Mutation: {
    signUp: async (parent, { data }, { prisma }) => {
      const checkMap = { email: data.email, facebookID: data.facebookID, googleID: data.googleID };
      if (
        (
          await prisma.user.findMany({
            where: getWhereObject(checkMap),
          })
        ).length > 0
      ) {
        throw new UserInputError('已註冊，請直接登入');
      }
      data.password = bcrypt.hashSync(data.password, 12);
      return await prisma.user.create({ data });
    },
    createCourse: async (parent, { data }, { prisma }) => {
      const newCourse = await prisma.course.create({ data });
      return newCourse;
    },
    createSystematicCourse: async (parent, { data }, { prisma }) => {
      const newCourse = await prisma.systematicCourse.create({
        data: {
          ...data,
          courseId: undefined,
          course: {
            connect: { id: data.courseId },
          },
        },
      });
      return newCourse;
    },
  },
  // Course: {
  //   __resolveType (obj, context, info) {
  //     console.log(obj);
  //     // obj 為該 field 得到的資料
  //     if (obj.vedioUrl) {
  //       // 回傳相對應得 Object type 名稱
  //       return 'SystematicCourse';
  //     }
  //     if (obj.reservations) {
  //       return 'OneToOneCourse';
  //     }
  //     return null;
  //   },
  // },
};

const schemaWithResolvers = addResolversToSchema({
  schema,
  resolvers,
});

module.exports = {
  schema: schemaWithResolvers,
};
