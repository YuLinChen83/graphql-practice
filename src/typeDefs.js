const { gql } = require('apollo-server');
const typeDefs = gql`
  ##################### Common 共用 ###################
  scalar DateTime
  scalar Date

  enum Gender {
    "Male"
    M
    "Female"
    F
    "TRANSGENDER"
    T
  }

  enum Sort {
    asc
    desc
  }

  """
  共用表格filter保留字參數
  """
  input TableStringFilterInput {
    ne: String
    eq: String
    le: String
    lt: String
    ge: String
    gt: String
    contains: String
    notContains: String
    between: [String]
    beginsWith: String
  }
  input TableIntFilterInput {
    equals: Int
    not: Int
    in: Int
    notIn: [Int]
    lt: Int
    lte: Int
    ge: Int
    gte: Int
  }

  ##################### User 使用者 ###################
  """
  建立使用者參數
  """
  input UserCreateInput {
    email: String!
    password: String!
    lastName: String!
    firstName: String!
    nickName: String!
    birthday: DateTime!
    headThumb: String
    desc: String
    roleId: Int!
    notified: Boolean
    activated: Boolean
    facebookId: String
    googleId: String
    updatedAt: DateTime
    courseIds: String
  }

  """
  可更新使用者參數
  """
  input UserUpdateInput {
    lastName: String
    firstName: String
    nickName: String
    headThumb: String
    desc: String
    notified: Boolean
    activated: Boolean
    facebookId: String
    googleId: String
  }

  """
  使用者欄位
  """
  type User {
    id: ID
    email: String
    lastName: String
    firstName: String
    nickName: String
    birthday: DateTime
    headThumb: String
    desc: String
    role: Role
    roleId: Int
    notified: Boolean
    activated: Boolean
    facebookId: String
    googleId: String
    createdAt: DateTime
    updatedAt: DateTime
    courseIds: String
  }

  type Role {
    id: ID
    code: String
    text: String
    permissionIds: String
  }

  """
  篩選User參數
  """
  input UserFilterKey {
    email: TableStringFilterInput
    lastName: TableStringFilterInput
    firstName: TableStringFilterInput
    nickName: TableStringFilterInput
    gender: TableStringFilterInput
    roleId: TableIntFilterInput
  }

  """
  排序User參數
  """
  input UserOrderByInput {
    email: Sort
    firstName: Sort
    birthday: Sort
    createdAt: Sort
    updatedAt: Sort
  }

  ##################### Course 課程 ###################
  """
  建立課程主檔參數
  """
  input CourseCreateInput {
    title: String!
    desc: String
    details: String
    price: Int!
    specialPrice: Int
    thumb: String
    vedioUrl: String
    totalTime: Int
    courseType: CourseType!
    teacherId: Int!
  }

  """
  可更新課程參數
  """
  input CourseUpdateInput {
    title: String
    desc: String
    details: String
    price: Int
    specialPrice: Int
    thumb: String
    vedioUrl: String
    totalTime: Int
    courseType: CourseType
    teacherId: Int
  }

  enum CourseType {
    ONLINE
    ONE_TO_ONE
    LIVE
  }

  """
  課程主檔欄位
  """
  type Course {
    id: ID
    title: String
    desc: String
    details: String
    price: String
    specialPrice: String
    thumb: String
    vedioUrl: String
    totalTime: Int
    courseType: CourseType
    teacherId: Int
    teacher: User
  }

  """
  篩選Course參數
  """
  input CourseFilterKey {
    title: TableStringFilterInput
    teacherId: TableStringFilterInput
    courseType: TableStringFilterInput
    price: TableStringFilterInput
    specialPrice: TableStringFilterInput
  }

  """
  排序Course參數
  """
  input CourseOrderByInput {
    title: Sort
    price: Sort
    specialPrice: Sort
    teacherId: Sort
    createdAt: Sort
    updatedAt: Sort
  }

  ##################### Course 課程 ###################
  """
  建立課程公告參數
  """
  input CourseNoticeboardCreateInput {
    title: String!
    desc: String
    thumb: String
  }

  """
  課程公告欄位
  """
  type CourseNoticeboard {
    courseId: Int
    course: Course
    title: String
    desc: String
    thumb: String
  }

  ##################### Root Object ###################

  type Query {
    currentUser: User
    users(filter: UserFilterKey, skip: Int, take: Int, orderBy: UserOrderByInput): [User!]
    signIn(email: String!, password: String!): User
    course(courseId: Int!): Course
    courses(filter: CourseFilterKey, skip: Int, take: Int, orderBy: CourseOrderByInput): [Course!]
  }

  type Mutation {
    signUp(data: UserCreateInput!): User
    updateUser(userId: Int!, data: UserUpdateInput!): User
    deleteUser(userId: Int!): Boolean
    createCourse(data: CourseCreateInput!): Course
    updateCourse(courseId: Int!, data: CourseUpdateInput!): Course
    addCourseNoticeboard(courseId: Int!, data: CourseNoticeboardCreateInput!): CourseNoticeboard
  }
`;

module.exports = {
  typeDefs,
};
