/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable functional/no-loop-statements */
/* eslint-disable functional/no-let */
/* eslint-disable functional/immutable-data */
/* eslint-disable functional/no-return-void */
/* eslint-disable functional/no-promise-reject */
/* eslint-disable functional/no-expression-statements */

import os from 'os'
import path from 'path'
import fs from 'fs/promises'
import { nanoid } from 'nanoid'
import { put } from '@vercel/blob'
import ffmpeg from 'fluent-ffmpeg'
import { Redis } from '@upstash/redis'
import type { APIRoute } from 'astro'
import ffmpegPath from 'ffmpeg-static'
import { hashMessage, recoverAddress, ZeroAddress } from 'ethers'
import {
	whenDefined,
	whenDefinedAll,
	whenNotError,
	whenNotErrorAll,
} from '@devprotocol/util-ts'

import { json } from 'utils/json'

// Tell fluent-ffmpeg where it can find FFmpeg
ffmpeg.setFfmpegPath(ffmpegPath || '')

// ... (same imports and setup)

export const POST: APIRoute = async ({ request, url }) => {
	const form = await request.formData()
	const ogFile = form.get('file') as File

	// Validate file, signature, message, etc. as before
	// ...

	const uniqueId = `${Date.now()}-${nanoid()}`
	const tempDir = os.tmpdir()
	const inputTempPath = path.join(tempDir, `input-${uniqueId}`)
	const outputPrefix = path.join(tempDir, `hls-${uniqueId}`)
	const m3u8Path = `${outputPrefix}.m3u8`

	// Save input and convert to HLS
	await fs.writeFile(inputTempPath, Buffer.from(await ogFile.arrayBuffer()))
	await new Promise((resolve, reject) => {
		ffmpeg(inputTempPath)
			.outputOptions([
				'-profile:v baseline',
				'-level 3.0',
				'-start_number 0',
				'-hls_time 10',
				'-hls_list_size 0',
				`-hls_segment_filename ${outputPrefix}-%03d.ts`,
				'-f hls',
			])
			.output(m3u8Path)
			.on('end', (_) => resolve(null))
			.on('error', reject)
			.run()
	})

	// Identify EOA, create basePath
	const eoa = ZeroAddress // Or compute from signature/message
	const nanoId = nanoid()
	const basePath = `${eoa}/${nanoId}`

	// Find all HLS files
	const dirFiles = await fs.readdir(tempDir)
	const hlsFiles = dirFiles.filter((f) => f.startsWith(`hls-${uniqueId}`))
	const segmentFiles = hlsFiles.filter((f) => f.endsWith('.ts'))

	// Upload segments and map their filenames to absolute URLs
	const segmentMap: Record<string, string> = {}
	for (const segmentFilename of segmentFiles) {
		const segmentData = await fs.readFile(path.join(tempDir, segmentFilename))
		const { url: segmentUrl } = await put(
			`${basePath}/${segmentFilename}`,
			segmentData,
			{
				access: 'public',
				contentType: 'video/mp2t',
			},
		)
		segmentMap[segmentFilename] = segmentUrl
		console.table({ segmentMap })
	}

	// Rewrite M3U8 file
	let m3u8Content = await fs.readFile(m3u8Path, 'utf8')
	for (const [localName, absoluteUrl] of Object.entries(segmentMap)) {
		m3u8Content = m3u8Content.replace(new RegExp(localName, 'g'), absoluteUrl)
	}

	// Upload updated M3U8
	const m3u8Buffer = Buffer.from(m3u8Content, 'utf8')
	const { url: m3u8Url } = await put(`${basePath}/index.m3u8`, m3u8Buffer, {
		access: 'public',
		contentType: 'application/x-mpegURL',
	})

	// Clean up
	await fs.unlink(inputTempPath).catch((_) => {})
	for (const f of hlsFiles) {
		await fs.unlink(path.join(tempDir, f)).catch((_) => {})
	}

	const fileId = nanoid()
	// Save m3u8Url to Redis if needed
	// ...

	const client = await whenNotError(
		new Redis({
			url: process.env.KV_REST_API_URL,
			token: process.env.KV_REST_API_TOKEN,
		}),
		async (_client) => {
			return _client
		},
	)

	const savedFileId = await whenNotErrorAll(
		[fileId, client, m3u8Url],
		async ([_fileId, _client, _m3u8Url]) => {
			return _client
				.set(_fileId, _m3u8Url)
				.then((res) => (res ? _fileId : new Error('Invalid res')))
				.catch((err) => new Error(err))
		},
	)
	return new Response(
		json({ m3u8Url, storageURL: `https://storage.clubs.place/${savedFileId}` }),
	)
}
