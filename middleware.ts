/* eslint-disable functional/no-conditional-statements */
import { whenNotErrorAll } from '@devprotocol/util-ts'
import { Redis } from '@upstash/redis'
import { rewrite, next } from '@vercel/edge'

export const config = {
	matcher: ['/((?!_astro).*)'],
}

export default async function middleware(req: Request) {
	const url = new URL(req.url)

	// Let the api and debug mode run.
	if (url.pathname.startsWith('/api') || url.pathname.startsWith('/debug')) {
		return next()
	}

	// Fetch nano id of the asset from url.
	const nanoId = url.pathname.split('/').at(-1)
	if (!nanoId) {
		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
		})
	}

	const client = new Redis({
		url: process.env.KV_REST_API_URL,
		token: process.env.KV_REST_API_READ_ONLY_TOKEN,
	})

	const originalURL = await whenNotErrorAll(
		[nanoId, client],
		async ([_nanoId, _client]) =>
			_client
				.get(_nanoId)
				.then((res: unknown) => (res ? (res as string) : ''))
				.catch((err: Error) => err as Error),
	)

	return originalURL instanceof Error || !originalURL
		? new Response(JSON.stringify({ error: 'Error occured' }), {
				status: 500,
			})
		: rewrite(new URL(originalURL))
}
