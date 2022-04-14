import { getFirelord } from 'firelordjs'
import { initializeApp } from 'firebase/app'
import { Example } from './dataType'

initializeApp({
	apiKey: '### FIREBASE API KEY ###',
	authDomain: '### FIREBASE AUTH DOMAIN ###',
	projectId: '### CLOUD FIRESTORE PROJECT ID ###',
})

export const example = getFirelord<Example>()('SomeCollectionName')