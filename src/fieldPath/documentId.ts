import { documentId as documentId_ } from 'firebase/firestore'
import { DocumentId } from '../types'

/**
 * Returns a special sentinel `FieldPath` to refer to the ID of a document.
 * It can be used in queries to sort or filter by the document ID.
 */
// @ts-expect-error
export const documentId: () => DocumentId = documentId_
