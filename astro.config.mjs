import { config } from 'dotenv'
import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel/serverless'

import vue from '@astrojs/vue'

 
config()

export default defineConfig({
	output: 'server',
	adapter: vercel(),
	integrations: [vue()],
})
