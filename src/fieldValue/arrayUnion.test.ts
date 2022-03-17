import { getFirelord } from '..'
import { setDoc, getDoc, updateDoc } from '../operations'
import { getFirestore } from 'firebase/firestore'
import { initializeApp } from '../utilForTests'
import { Creator } from '../types'
import { arrayUnion } from './arrayUnion'

initializeApp()
describe('test arrayUnion', () => {
	const ref = getFirelord(getFirestore())<
		Creator<{ a: number[] }, 'arrayUnion', string>
	>('arrayUnion')
	const docRef = ref.doc('arrayUnion')
	it('test with set', async () => {
		await setDoc(docRef, { a: [-100] })
		await setDoc(docRef, { a: arrayUnion(100) })
		const docSnap = await getDoc(docRef)
		const data = docSnap.data()
		expect(data).not.toBe(undefined)
		if (data) {
			expect(data.a).toEqual([100])
		}
	})
	it('test with update', async () => {
		await updateDoc(docRef, { a: arrayUnion(-100) })
		const docSnap = await getDoc(docRef)
		const data = docSnap.data()
		expect(data).not.toBe(undefined)
		if (data) {
			expect(data.a).toEqual([100, -100])
			expect(data.a).not.toEqual([-100, 100])
		}
	})
	it('test with empty array', async () => {
		await updateDoc(docRef, { a: arrayUnion() })
		const docSnap = await getDoc(docRef)
		const data = docSnap.data()
		expect(data).not.toBe(undefined)
		if (data) {
			expect(data.a).toEqual([100, -100])
			expect(data.a).not.toEqual([-100, 100])
		}
	})
})
