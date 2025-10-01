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
		<div class="mb-4 flex items-center gap-4">
			<input
				name="file"
				ref="inputFileRef"
				type="file"
				multiple
				required
				class="rounded border px-2 py-1 transition hover:bg-gray-200 active:bg-gray-300"
			/>
			<input type="checkbox" id="hls" name="hls" v-model="hls" />
			<label for="hls">Convert video to HLS</label>
		</div>
		<button
			type="submit"
			class="rounded border px-2 py-1 transition hover:bg-gray-200 active:bg-gray-300"
		>
			Upload
		</button>
	</form>

	<hr class="my-4" />
	{{ hls }}

	<ul class="grid gap-4">
		<li class="grid grid-cols-4 items-center gap-4">
			<span class="font-bold">Preview</span>
			<span class="font-bold">Content Type</span>
			<span class="font-bold">URL</span>
		</li>
		<li
			v-for="blob in blobs"
			:key="blob.url"
			class="grid grid-cols-4 items-center gap-4"
		>
			<img
				:src="blob.storageURL"
				alt=""
				class="size-10 rounded object-contain"
			/>
			<span class="mono text-sm">{{ blob.contentType }}</span>
			<span class="mono flex flex-col items-start gap-1 text-sm"
				><a
					:href="blob.storageURL"
					target="_blank"
					class="text-blue-500 underline"
					>{{ blob.storageURL }}</a
				>
				<button
					@click="() => setClipboard(blob.storageURL)"
					class="rounded border px-2 py-1 transition hover:bg-gray-200 active:bg-gray-300"
				>
					Copy
				</button></span
			>
		</li>
	</ul>
</template>

<style>
@import '../global.css';
</style>
