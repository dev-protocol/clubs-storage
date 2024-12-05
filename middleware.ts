/* eslint-disable functional/no-conditional-statements */
/* eslint-disable functional/no-expression-statements */
import { Redis } from '@upstash/redis'
import { rewrite, next } from '@vercel/edge'
import type { RequestContext } from '@vercel/edge'

export const config = {
	matcher: ['/((?!_astro).*)'],
}

export default function middleware(req: Request, context: RequestContext) {
	const url = new URL(req.url)

	// Let the api and debug mode run.
	if (url.pathname.startsWith('/api') || url.pathname.startsWith('/debug')) {
		return next()
	}

	// Fetch nano id of the asset from url.
	const nanoId = url.pathname.split('/').at(-1)
	if (!nanoId) {
		return new Response(JSON.stringify({ error: 'Error 1: Not found' }), {
			status: 404,
		})
	}

	const client = new Redis({
		url: process.env.KV_REST_API_URL,
		token: process.env.KV_REST_API_READ_ONLY_TOKEN,
	})

	context.waitUntil(
		client.get(nanoId).then((res) => {
			const originalURL = res ? (res as string) : ''
			if (!originalURL) {
				return new Response(JSON.stringify({ error: 'Error 2: Not found' }), {
					status: 404,
				})
			}

			return rewrite(new URL(originalURL))
		}),
	)
}
