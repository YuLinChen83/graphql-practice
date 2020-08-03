const { makeExecutableSchema } = require('graphql-tools');
const { importSchema } = require('graphql-import');
const { DateTimeResolver, DateResolver } = require('graphql-scalars');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-core');
const { combineResolvers, skip } = require('graphql-resolvers');
const { sendEmail } = require('./utils/email');

const typeDefs = importSchema('src/schemas/schema.graphql');

const createTokens = user => {
  const refreshToken = jwt.sign(
    { userId: user.id, count: user.count, role: user.role },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' },
  );
  const accessToken = jwt.sign({ userId: user.id, role: user.role }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '15min',
  });
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
    currentUser: async (parent, args, { prisma, currentUser }) =>
      await prisma.user.findOne({ where: { id: currentUser.userId } }),
    user: combineResolvers(isAuthenticated, (parent, { where }, { prisma }) => {
      return prisma.user.findOne({ where: { id: Number(where.id) } });
    }),
    users: combineResolvers(isAuthenticated, async (parent, { where }, { prisma }) => {
      Object.keys(where).forEach(key => {
        where[key] = { contains: where[key] };
      });
      return await prisma.user.findMany({ where });
    }),
    // feed: (parent, args, ctx) => {
    //   return ctx.prisma.post.findMany({
    //     where: { published: true },
    //   })
    // },
    // filterPosts: (parent, args, ctx) => {
    //   return ctx.prisma.post.findMany({
    //     where: {
    //       OR: [
    //         { title: { contains: args.searchString } },
    //         { content: { contains: args.searchString } },
    //       ],
    //     },
    //   })
    // },
    // post: (parent, args, ctx) => {
    //   return ctx.prisma.post.findOne({
    //     where: { id: Number(args.where.id) },
    //   })
    // },
    signIn: async (parent, { email, password }, { prisma, response, request }) => {
      const user = await prisma.user.findOne({ where: { email } });
      if (!user || !bcrypt.compareSync(password, user.password))
        throw new AuthenticationError('登入失敗：帳號或密碼錯誤');
      const { accessToken, refreshToken } = createTokens(user);
      response.cookie('refreshToken', refreshToken, { httpOnly: true });
      response.cookie('accessToken', accessToken, { httpOnly: true });
      return user;
    },
  },
  Mutation: {
    signUp: async (parent, { data }, { prisma }) => {
      if (await prisma.user.findOne({ where: { email: data.email } })) throw new AuthenticationError('信箱已被註冊');
      const hashedPassword = bcrypt.hashSync(data.password, 12);
      data.password = hashedPassword;
      await prisma.user.create({ data });
      return true;
    },
    signOut: (parent, args, { request, response, currentUser }) => {
      if (!currentUser) {
        throw new Error('未登入狀態無需登出');
      }
      response.clearCookie('accessToken');
      response.clearCookie('refreshToken');
      return true;
    },
    updateCurrentUser: combineResolvers(isAuthenticated, async (parent, { data }, { prisma, currentUser }) => {
      const user = await prisma.user.update({
        where: { id: currentUser.userId },
        data,
      });
      return user;
    }),
    forgotPassword: async (parent, { email }, { prisma, host }) => {
      if (!prisma.user.findOne({ where: { email } })) throw new AuthenticationError('查無此 email 使用者');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      const passwordResetExpires = Date.now() + 10 * 60 * 1000;
      const resetURL = `https://${host}/api/v1/users/resetPassword/${resetToken}`;
      const message = `忘記密碼？請用前往：${resetURL}重設密碼。\n如果您無忘記密碼，請無視此訊息。`;
      try {
        await prisma.user.updateMany({
          where: { email },
          data: {
            passwordResetToken,
            passwordResetExpires: new Date(passwordResetExpires),
          },
        });
        await sendEmail({
          email,
          subject: '密碼重設 (10分鐘後過期)',
          message,
        });
        return true;
      } catch (err) {
        await prisma.user.update({
          where: { email },
          data: {
            passwordResetToken: null,
            passwordResetExpires: null,
          },
        });
        return new Error('密碼重設信件信送失敗');
      }
    },
    resetPassword: async (parent, { token, email, password }, { prisma }) => {
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
      const users = await prisma.user.updateMany({
        where: {
          passwordResetToken: hashedToken,
          passwordResetExpires_gt: new Date(),
        },
      });
      if (!user[0]) throw new AuthenticationError('Token 無效或是已過期');
      await prisma.updateUser({
        where: { email:user[0].email },
        data: {
          password,
          passwordResetToken: null,
          passwordResetExpires: null,
          passwordChangedAt: new Date(),
        },
      });
      return true;
    },
    // createDraft: (parent, args, ctx) => {
    //   return ctx.prisma.post.create({
    //     data: {
    //       title: args.title,
    //       content: args.content,
    //       published: false,
    //       author: {
    //         connect: { email: args.authorEmail },
    //       },
    //     },
    //   })
    // },
    // deleteOnePost: (parent, args, ctx) => {
    //   return ctx.prisma.post.delete({
    //     where: { id: Number(args.where.id) },
    //   })
    // },
    // publish: (parent, args, ctx) => {
    //   return ctx.prisma.post.update({
    //     where: { id: Number(args.id) },
    //     data: { published: true },
    //   })
    // },
    // signupUser: (parent, args, ctx) => {
    //   return ctx.prisma.user.create(args)
    // },
  },
  // User: {
  //   posts: (parent, args, ctx) => {
  //     return ctx.prisma.user
  //       .findOne({
  //         where: { id: parent.id },
  //       })
  //       .posts()
  //   },
  // },
  // Post: {
  //   author: (parent, args, ctx) => {
  //     return ctx.prisma.post
  //       .findOne({
  //         where: { id: parent.id },
  //       })
  //       .author()
  //   },
  // },
};

const schema = makeExecutableSchema({
  resolvers,
  typeDefs,
});

module.exports = {
  schema,
};
