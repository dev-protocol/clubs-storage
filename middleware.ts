/* eslint-disable functional/no-let */
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
	if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/debug')) {
		next()
	}

	// Fetch nano id of the asset from url.
	const nanoId = url.pathname.split('/').at(0)
	if (!nanoId) {
		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
		})
	}

	const client = new Redis({
		url: process.env.KV_REST_API_URL,
		token: process.env.KV_REST_API_READ_ONLY_TOKEN,
	})

	let originalURL: string = ''
	context.waitUntil(
		client.get(nanoId).then((res) => {
			originalURL = res ? (res as string) : ''
			return res
		}),
	)

	return rewrite(new URL(originalURL))
}
