<script setup lang="ts">
import type { PutBlobResult } from '@vercel/blob'
import { ref, useTemplateRef } from 'vue'

const input = useTemplateRef<HTMLInputElement>('inputFileRef')
const blob = ref<PutBlobResult>()
const hls = ref<boolean>()

const onSubmit = async (event: Event) => {
	event.preventDefault()

	if (!input.value?.files) {
		throw new Error('No file selected')
	}

	const file = input.value.files[0]

	const formData = new FormData()
	formData.append('file', file)

	const response = await fetch(`/api/blob${hls.value ? '?convert=hls' : ''}`, {
		method: 'POST',
		body: formData,
	})

	const newBlob = (await response.json()) as PutBlobResult
	console.table(newBlob)
	blob.value = newBlob
}
</script>

<template>
	<h1>Upload Image</h1>

	<form @submit="onSubmit">
		<input name="file" ref="inputFileRef" type="file" required />
		<input type="checkbox" id="hls" name="hls" v-model="hls" />
		<label for="hls">Convert video to HLS</label>
		<button type="submit">Upload</button>
	</form>

	<hr />
	{{ hls }}

	{{ blob }}
</template>
