import { buildApp } from './app.js'

const start = async () => {
    const app = await buildApp()
    await app.listen({ port: Number(process.env.PORT) || 3000 })
}

start()
