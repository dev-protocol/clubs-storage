import { nanoid } from 'nanoid'
import { put } from '@vercel/blob'
import { Redis } from '@upstash/redis'
import type { APIRoute } from 'astro'
import { hashMessage, recoverAddress, ZeroAddress } from 'ethers'
import {
	whenDefined,
	whenDefinedAll,
	whenNotError,
	whenNotErrorAll,
} from '@devprotocol/util-ts'

import { json } from 'utils/json'

export const POST: APIRoute = async ({ request, url }) => {
	const form = await request.formData()

	const props = whenDefinedAll(
		[url.searchParams.get('signature'), url.searchParams.get('message')],
		([signature, message]) => ({ signature, message }),
	)
	const file =
		whenDefined(form.get('file'), (file) => file) ??
		new Error('File is missing.')
	const eoa =
		whenDefined(props, ({ signature, message }) =>
			recoverAddress(hashMessage(message), signature),
		) ?? ZeroAddress

	const nanoId = nanoid()
	const pathname = `${eoa}/${nanoId}` // a random UID generated by Vercel Blob will be added after this.

	const blob = await whenNotError(file, (_file) =>
		put(pathname, _file, {
			access: 'public',
			multipart: true, // To upload large files successfully.
		}),
	)

	const client = await whenNotError(
		new Redis({
			url: process.env.KV_REST_API_URL,
			token: process.env.KV_REST_API_TOKEN,
		}),
		async (_client) => {
			return _client
		},
	)

	const savedNanoId = await whenNotErrorAll(
		[nanoId, client, blob],
		async ([_nanoId, _client, _blob]) => {
			return _client
				.set(_nanoId, _blob.url)
				.then((res) => (res ? _nanoId : new Error('Invalid res')))
				.catch((err) => new Error(err))
		},
	)

	return new Response(json({ blob, savedNanoId }))
}
