const resolvers = require('./todo-resolvers')
const Queue = require('bee-queue')
const Redis = require('ioredis')

const redis = new Redis()
// connects up to redis (uses pub/sub for managing queues)
const queue = new Queue('todo-queue')

const { GraphQLServer } = require('graphql-yoga')

const server = new GraphQLServer({
  typeDefs: 'src/schema.graphql',
  context: { redis, queue },
  resolvers
})

server.start(() => console.log(`
  🚀  Server is running!
  🔉  Listening on port 4000
`))
