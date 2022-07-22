
const logger = require('pino')()
const Queue = require('bee-queue')
const Redis = require("ioredis")

const handlers = {
  writeTodo,
  deleteTodo
}

const getKey = (id) => `TODOS:${id}`

async function writeTodo(payload, context) {
  const { logger, redis } = context
  const { id, title, completed } = payload
  const key = getKey(id)
  await redis.hmset(key, { id, title, completed })
  logger.info({ id }, 'success, written todo!')
  return { id, title, completed }
}

async function deleteTodo(payload, context) {
  const { logger, redis } = context
  const { id } = payload
  const key = getKey(id)
  if (!await redis.exists(key)) {
    throw new Error(`No Todo for id ${id}, unable to delete.`)
  }
  await redis.del(key)
  logger.info({ id }, 'success, deleted todo!')
  return { id }
}

async function main() {
  const todoQueue = new Queue('todo-queue')
  const context = {
    logger,
    redis: new Redis()
  }

  // we can can only add one handler per queue - use multiple queues
  // for different handlers
  logger.info('setting up handlers')
  todoQueue.process(todoHandler(context))
  logger.info('done setting up handlers')
}

function todoHandler(context) {
  const { logger } = context
  return async function (job) {
    const { message, payload } = job.data
    // // if we don't have a handler defined throw an error for the job
    // // which fails the job
    if (!Object.keys(handlers).includes(message)) {
      throw new Error('No handler available for job')
    }
    logger.info({ message }, `processing`)
    // if the handler throws then we want it to fail and push the job into a failed state
    const result = await handlers[message](payload, context)
    logger.info({ id: job.id }, 'done processing job')
    return result
  }
}

main().catch(error => {
  logger.error(error)
})