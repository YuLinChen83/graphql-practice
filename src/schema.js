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

const schema = loadSchemaSync(path.join(__dirname, 'schemas/schema.graphql'), {
  loaders: [new GraphQLFileLoader()],
});

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
      async (parent, { filter, skip, take, orderBy }, { prisma }) =>
        await prisma.user.findMany({ where: filter || {}, skip, take, orderBy }),
    ),
    signIn: async (parent, { email, password }, { prisma, response, request }) => {
      const user = await prisma.user.findOne({ where: { email } });
      if (!user || !bcrypt.compareSync(password, user.password)) {
        throw new AuthenticationError('登入失敗：帳號或密碼錯誤');
      }
      const { accessToken, refreshToken } = createTokens(user);
      response.cookie('refreshToken', refreshToken, { httpOnly: true });
      response.cookie('accessToken', accessToken, { httpOnly: true });
      return user;
    },
    course: async (parent, { courseId }, { prisma }) =>
      await prisma.course.findOne({ where: { id: courseId }, include: { teacher: true } }),
    courses: async (parent, { filter, skip, take, orderBy }, { prisma }) => {
      return await prisma.course.findMany({
        where: filter || {},
        skip,
        take,
        orderBy,
        include: { teacher: true },
      });
    },
  },
  Mutation: {
    signUp: async (parent, { data }, { prisma }) => {
      if (!!(await prisma.user.findOne({ where: { email: data.email } }))) {
        throw new UserInputError('已註冊，請直接登入');
      }
      data.password = bcrypt.hashSync(data.password, 12);
      return await prisma.user.create({
        data: {
          ...data,
          roleId: undefined,
          role: {
            connect: { id: data.roleId },
          },
        },
        include: { role: true },
      });
    },
    updateUser: async (parent, { userId, data }, { prisma }) => {
      return await prisma.user.update({
        where: { id: userId },
        data,
        include: { role: true },
      });
    },
    deleteUser: async (parent, { userId }, { prisma }, info) => {
      await prisma.user.delete({ where: { id: userId } });
      return true;
    },
    createCourse: async (parent, { data }, { prisma }) =>
      await prisma.course.create({
        data: {
          ...data,
          teacherId: undefined,
          teacher: {
            connect: { id: data.teacherId },
          },
        },
      }),
    updateCourse: async (parent, { courseId, data }, { prisma }) =>
      await prisma.course.update({
        where: { id: courseId },
        data,
        include: { teacher: true },
      }),
    addCourseNoticeboard: async (parent, { courseId, data }, { prisma }) => {
      const course = await prisma.course.findOne({ where: { id: courseId } });
      if (!course) {
        throw new AuthenticationError('課程主檔不存在');
      }
      return await prisma.courseNoticeboard.create({
        data: {
          ...data,
          courseId: undefined,
          course: {
            connect: { id: courseId },
          },
        },
        include: { course: true },
      });
    },
  },
};

const schemaWithResolvers = addResolversToSchema({
  schema,
  resolvers,
});

module.exports = {
  schema: schemaWithResolvers,
};
