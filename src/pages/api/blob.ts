import { whenDefined, whenDefinedAll, whenNotError } from '@devprotocol/util-ts'
import { put } from '@vercel/blob'
import type { APIRoute } from 'astro'
import { hashMessage, recoverAddress, ZeroAddress } from 'ethers'
import { nanoid } from 'nanoid'
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

	const pathname = `${eoa}/${nanoid()}` // a random UID generated by Vercel Blob will be added after this.

	const blob = await whenNotError(file, (_file) =>
		put(pathname, _file, {
			access: 'public',
		}),
	)

	return new Response(json(blob))
}
