
import Fastify from 'fastify'

export async function buildApp() {
  const app = Fastify({ logger: true })
  return app
}
