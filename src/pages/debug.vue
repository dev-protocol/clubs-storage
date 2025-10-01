<script setup lang="ts">
import type { PutBlobResult } from '@vercel/blob'
import { ref, useTemplateRef } from 'vue'

type Res = PutBlobResult & { storageURL: string }

const input = useTemplateRef<HTMLInputElement>('inputFileRef')
const multipleFiles = ref<{ file: File; url?: string }[]>()
const blobs = ref<Res[]>()
const hls = ref<boolean>()

const onSubmit = async (event: Event) => {
	event.preventDefault()

	if (!input.value?.files) {
		throw new Error('No file selected')
	}

	const files = input.value.files
	multipleFiles.value = Array.from(files).map((file) => ({
		file,
	}))

	const responses = await Promise.all(
		Array.from(files).map((file) => {
			const formData = new FormData()
			formData.append('file', file)
			return fetch(`/api/blob${hls.value ? '?convert=hls' : ''}`, {
				method: 'POST',
				body: formData,
			})
		}),
	)

	const newBlobs = (await Promise.all(
		responses.map((res) => res.json()),
	)) as Res[]
	console.table(newBlobs)
	blobs.value = newBlobs
}

async function setClipboard(text: string) {
	const type = 'text/plain'
	const clipboardItemData = {
		[type]: text,
	}
	const clipboardItem = new ClipboardItem(clipboardItemData)
	await navigator.clipboard.write([clipboardItem])
}
</script>

<template>
	<h1>Upload Images</h1>

	<form @submit="onSubmit">
		<input name="file" ref="inputFileRef" type="file" multiple required />
		<input type="checkbox" id="hls" name="hls" v-model="hls" />
		<label for="hls">Convert video to HLS</label>
		<button type="submit">Upload</button>
	</form>

	<hr />
	{{ hls }}

	<ul class="blobs">
		<li v-for="blob in blobs" :key="blob.url" class="blob">
			<img :src="blob.storageURL" alt="" class="blob-image" />
			<span class="span">{{ blob.contentType }}</span>
			<span>{{ blob.url }}</span>
			<span
				>{{ blob.storageURL }}
				<button @click="() => setClipboard(blob.storageURL)" class="button">
					Copy
				</button></span
			>
		</li>
	</ul>
</template>

<style scoped>
.blobs {
	list-style: none;
	padding: 0;
	display: grid;
	gap: 1rem;
}
.blob {
	display: flex;
	align-items: center;
	gap: 1rem;
}
.blob-image {
	width: 4rem;
	height: 4rem;
	object-fit: contain;
	border: 1px solid #ccc;
	border-radius: 0.25rem;
}
.span {
	font-family: monospace;
	font-size: small;
}

.button {
	border: 1px solid #ccc;
	border-radius: 3px;
	padding: 0.25rem 0.5rem;
}
</style>
