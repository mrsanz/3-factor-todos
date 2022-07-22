const { v4: uuid } = require('uuid')

const resolvers = {
  Query: {
    allTodos,
    todo
  },
  Mutation: {
    createTodo,
    editTodo,
    deleteTodo,
    clearAllTodos
  }
}

const matchKey = (id = '*') => `TODOS:${id}`
const hydrateId = (key) => key.split(':')[1]

async function allTodos(parent, args, context, info) {
  const { redis } = context
  const all = []
  for await (const keys of redis.scanStream({ match: matchKey() })) {
    for (const key of keys) {
      const id = hydrateId(key)
      const { title, completed } = await redis.hgetall(key)
      all.push({ id, title, completed: (completed === 'true') })
    }
  }
  return all
}

async function clearAllTodos(parent, args, context, info) {
  const { queue, redis } = context
  let counter = 0
  for await (const keys of redis.scanStream({ match: matchKey() })) {
    for (const key of keys) {
      const id = hydrateId(key)
      counter++
      await handleTodo({ queue, message: 'deleteTodo', payload: { id } })
    }
  }
  return counter
}

function todo(parent, args, context, info) {
  const { id } = args
  const { redis } = context
  const key = matchKey(id)
  return (id) ? redis.hgetall(key) : {}
}

// reall cool feature of this pattern for longer processing.
// function calculateWeight (parent, args, context, info) {
//   // create a job, take job id
//   // subscribe to a redis queue for that id
//   // publish data as it is published for that id on a graphql subscription.
// }

function createTodo(parent, args, context, info) {
  const { title, completed } = args
  const { queue } = context
  const id = uuid()
  return handleTodo({ queue, message: 'writeTodo', payload: { id, title, completed } })
}

function editTodo(parent, args, context, info) {
  const { id, title, completed } = args
  const { queue } = context
  return handleTodo({ queue, message: 'writeTodo', payload: { id, title, completed } })
}

function deleteTodo(parent, args, context, info) {
  const { id } = args
  const { queue } = context
  return handleTodo({ queue, message: 'deleteTodo', payload: { id } })
}

// shuttle off commands to our worker queues - currently all our mutations
async function handleTodo({ queue: todoQueue, message, payload = {} }) {
  if (!message) {
    return
  }
  const job = todoQueue.createJob({ message, payload })
  job.save()
  return new Promise((resolve, reject) => {
    job.on('succeeded', resolve)
    job.on('failed', reject)
  })
}

module.exports = resolvers
