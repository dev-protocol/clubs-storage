/* eslint-disable functional/no-let */
/* eslint-disable functional/no-conditional-statements */
/* eslint-disable functional/no-expression-statements */
import dotenv from 'dotenv'
import { createClient } from 'redis'
import { rewrite, next } from '@vercel/edge'
import type { RequestContext } from '@vercel/edge'

export const config = {
	matcher: ['/((?!_astro).*)'],
}

dotenv.config()

export default function middleware(req: Request, context: RequestContext) {
	const url = new URL(req.url)

	const client = createClient({
		url: process.env.REDIS_URL,
		username: process.env.REDIS_USERNAME ?? '',
		password: process.env.REDIS_PASSWORD ?? '',
	})

	if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/debug')) {
		next()
	}

	const nanoId = url.pathname.split('/').at(0)
	if (!nanoId) {
		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
		})
	}

	let originalURL: string = ''
	context.waitUntil(
		client.get(nanoId).then((res) => {
			originalURL = res ? res : ''
			return res
		}),
	)

	return rewrite(originalURL)
}
