const fastify = require('fastify')()
const fastifyStatic = require('fastify-static')
const path = require('path')


module.exports = async function (fastify, options) {
  // first plugin
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, 'static')
  })
}
