import { getFirelord, MetaTypeCreator } from '.'
import { initializeApp, User } from './utilForTests'
import { getFirestore } from 'firebase/firestore'

initializeApp()

type parent = MetaTypeCreator<
	{
		a: { b: string; c: boolean }
		d: number
		e: { f: string[] }
	},
	'parent',
	string
>

type child = MetaTypeCreator<
	{
		a: { b: string; c: boolean }
		d: number
		e: { f: string[] }
	},
	'child',
	string,
	parent
>

describe('test', () => {
	it('test incorrect collection', () => {
		;() => getFirelord()<child>('parent//child').collection()
		;() =>
			getFirelord()<User>(
				// @ts-expect-error
				`topLevel//Users`
			)
	})
	it('test type', () => {
		;() => {
			getFirelord(getFirestore())<User>(
				// @ts-expect-error
				`topLevel/FirelordTest1/Users`
			)
			const userRef = getFirelord()<User>(
				// @ts-expect-error
				'User1s'
			)
			userRef.doc(
				// @ts-expect-error
				123
			)
			userRef.collection(
				// @ts-expect-error
				false
			)
			userRef.collectionGroup(
				// @ts-expect-error
				{}
			)
		}
	})
})
