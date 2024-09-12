# How to use the API endpoint

See: [`src/pages/debug.vue`](https://github.com/dev-protocol/clubs-storage/blob/main/src/pages/debug.vue)

```js
const response = await fetch(`https://storage.clubs.place/api/blob`, {
	method: 'POST',
	body: formData,
})
```

or, you can add your EOA address on the file name by adding message and signature:

```js
const response = await fetch(
	`https://storage.clubs.place/api/blob?message=SIGNED_MESSAGE&signature=0x...`,
	{
		method: 'POST',
		body: formData,
	},
)
```
