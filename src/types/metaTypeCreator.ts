import { FirelordFirestore } from './firelordFirestore'
import {
	ErrorFieldValueInArray,
	ErrorUnassignedAbleFieldValue,
	NoUndefinedAndBannedTypes,
	NoDirectNestedArray,
	ErrorPossiblyUndefinedAsArrayElement,
	ErrorCollectionIDString,
} from './error'
import { IsValidID } from './validID'
import {
	FieldValues,
	UnassignedAbleFieldValue,
	ArrayUnionOrRemove,
	Increment,
	DeleteField,
	ServerTimestamp,
	PossiblyReadAsUndefined,
} from './fieldValue'
import { ObjectFlattenHybrid } from './objectFlatten'
import {
	RecursiveExcludePossiblyUndefinedFieldValue,
	RecursiveReplaceUnionInvolveObjectTypeWithErrorMsg,
} from './markUnionObjectAsError'
import { NotTreatedAsObjectType } from './ref'

export type IdAndPath = {
	docID: string
	collectionID: string
	docPath: string
	collectionPath: string
}

export type MetaType = {
	collectionPath: string
	collectionID: string
	docID: string
	docPath: string
	read: Record<string, unknown>
	write: Record<string, unknown>
	writeFlatten: Record<string, unknown>
	compare: Record<string, unknown>
	base: Record<string, unknown>
	parent: IdAndPath | null
	ancestors: IdAndPath[]
}

export type MetaTypeCreator<
	Base extends Record<string, unknown>,
	CollectionID extends string,
	DocID extends string = string,
	Parent extends MetaType | null = null,
	Settings extends {
		allFieldsPossiblyUndefined?: boolean
		banNull?: boolean
	} = { allFieldsPossiblyUndefined: false; banNull: false }
> = {
	base: Base
	read: {
		[J in keyof RecursiveReplaceUnionInvolveObjectTypeWithErrorMsg<Base>]-?: ReadConverter<
			RecursiveReplaceUnionInvolveObjectTypeWithErrorMsg<Base>[J],
			Settings['allFieldsPossiblyUndefined'] extends true ? undefined : never,
			Settings['banNull'] extends true ? null : never
		>
	}
	// so it looks more explicit in typescript hint
	write: {
		[J in keyof RecursiveReplaceUnionInvolveObjectTypeWithErrorMsg<Base>]-?: WriteConverter<
			RecursiveReplaceUnionInvolveObjectTypeWithErrorMsg<Base>[J],
			Settings['banNull'] extends true ? null : never
		>
	}
	writeFlatten: {
		[J in keyof ObjectFlattenHybrid<
			RecursiveReplaceUnionInvolveObjectTypeWithErrorMsg<
				RecursiveExcludePossiblyUndefinedFieldValue<Base>
			>
		>]-?: WriteConverter<
			ObjectFlattenHybrid<
				RecursiveReplaceUnionInvolveObjectTypeWithErrorMsg<
					RecursiveExcludePossiblyUndefinedFieldValue<Base>
				>
			>[J],
			Settings['banNull'] extends true ? null : never
		>
	}
	compare: {
		[J in keyof ObjectFlattenHybrid<
			RecursiveReplaceUnionInvolveObjectTypeWithErrorMsg<
				RecursiveExcludePossiblyUndefinedFieldValue<Base>
			>
		>]-?: CompareConverter<
			ObjectFlattenHybrid<
				RecursiveReplaceUnionInvolveObjectTypeWithErrorMsg<
					RecursiveExcludePossiblyUndefinedFieldValue<Base>
				>
			>[J],
			Settings['banNull'] extends true ? null : never
		>
	}

	collectionID: NoUndefinedAndBannedTypes<
		string extends CollectionID
			? ErrorCollectionIDString
			: IsValidID<CollectionID, 'Collection', 'ID'>,
		never
	>
	collectionPath: Parent extends MetaType
		? `${Parent['collectionPath']}/${Parent['docID']}/${CollectionID}`
		: CollectionID
	docID: IsValidID<DocID, 'Document', 'ID'>
	docPath: Parent extends MetaType
		? `${Parent['collectionPath']}/${Parent['docID']}/${CollectionID}/${DocID}`
		: `${CollectionID}/${DocID}`
	parent: Parent
	ancestors: Parent extends MetaType
		? [
				...Parent['ancestors'],
				{
					docID: DocID
					collectionID: CollectionID
					docPath: Parent extends MetaType
						? `${Parent['collectionPath']}/${Parent['docID']}/${CollectionID}/${DocID}`
						: `${CollectionID}/${DocID}`
					collectionPath: Parent extends MetaType
						? `${Parent['collectionPath']}/${Parent['docID']}/${CollectionID}`
						: CollectionID
				}
		  ]
		: [
				{
					docID: DocID
					collectionID: CollectionID
					docPath: Parent extends MetaType
						? `${Parent['collectionPath']}/${Parent['docID']}/${CollectionID}/${DocID}`
						: `${CollectionID}/${DocID}`
					collectionPath: Parent extends MetaType
						? `${Parent['collectionPath']}/${Parent['docID']}/${CollectionID}`
						: CollectionID
				}
		  ]
}

type ReadConverterArray<
	T,
	AllFieldsPossiblyUndefined,
	BannedTypes,
	InArray extends boolean
> = NoDirectNestedArray<T> extends T
	? T extends (infer A)[]
		?
				| ReadConverterArray<A, AllFieldsPossiblyUndefined, BannedTypes, true>[]
				| (InArray extends true ? never : AllFieldsPossiblyUndefined)
		: T extends FieldValues
		? ErrorFieldValueInArray
		: T extends Date | FirelordFirestore.Timestamp
		?
				| FirelordFirestore.Timestamp
				| (InArray extends true ? never : AllFieldsPossiblyUndefined)
		: T extends PossiblyReadAsUndefined
		? InArray extends true
			? ErrorPossiblyUndefinedAsArrayElement
			: undefined
		: T extends NotTreatedAsObjectType
		? T | AllFieldsPossiblyUndefined
		: T extends Record<string, unknown>
		?
				| {
						[K in keyof T]-?: ReadConverterArray<
							T[K],
							AllFieldsPossiblyUndefined,
							BannedTypes,
							false
						>
				  }
				| (InArray extends true ? never : AllFieldsPossiblyUndefined)
		: NoUndefinedAndBannedTypes<T, BannedTypes> | AllFieldsPossiblyUndefined
	: NoUndefinedAndBannedTypes<T, BannedTypes> | AllFieldsPossiblyUndefined

type ReadConverter<T, AllFieldsPossiblyUndefined, BannedTypes> =
	NoDirectNestedArray<T> extends T
		? T extends (infer A)[]
			?
					| ReadConverterArray<
							A,
							AllFieldsPossiblyUndefined,
							BannedTypes,
							true
					  >[]
					| AllFieldsPossiblyUndefined
			: T extends ServerTimestamp | Date | FirelordFirestore.Timestamp
			? FirelordFirestore.Timestamp | AllFieldsPossiblyUndefined
			: T extends DeleteField | PossiblyReadAsUndefined
			? undefined
			: T extends UnassignedAbleFieldValue
			? ErrorUnassignedAbleFieldValue
			: T extends NotTreatedAsObjectType
			? T | AllFieldsPossiblyUndefined
			: T extends Record<string, unknown>
			?
					| {
							[K in keyof T]-?: ReadConverter<
								T[K],
								AllFieldsPossiblyUndefined,
								BannedTypes
							>
					  }
					| AllFieldsPossiblyUndefined
			: NoUndefinedAndBannedTypes<T, BannedTypes> | AllFieldsPossiblyUndefined
		: NoUndefinedAndBannedTypes<T, BannedTypes> | AllFieldsPossiblyUndefined

type CompareConverterArray<T, BannedTypes> = NoDirectNestedArray<T> extends T
	? T extends (infer A)[]
		? CompareConverterArray<A, BannedTypes>[]
		: T extends FieldValues
		? ErrorFieldValueInArray
		: T extends Date | FirelordFirestore.Timestamp
		? FirelordFirestore.Timestamp | Date
		: T extends PossiblyReadAsUndefined
		? never
		: T extends NotTreatedAsObjectType
		? T
		: T extends Record<string, unknown>
		? {
				[K in keyof T]-?: CompareConverterArray<T[K], BannedTypes>
		  }
		: NoUndefinedAndBannedTypes<T, BannedTypes>
	: NoUndefinedAndBannedTypes<T, BannedTypes>

type CompareConverter<T, BannedTypes> = NoDirectNestedArray<T> extends T
	? T extends (infer A)[]
		? CompareConverterArray<A, BannedTypes>[]
		: T extends ServerTimestamp | Date | FirelordFirestore.Timestamp
		? FirelordFirestore.Timestamp | Date
		: T extends UnassignedAbleFieldValue
		? ErrorUnassignedAbleFieldValue
		: T extends PossiblyReadAsUndefined | DeleteField
		? never
		: T extends NotTreatedAsObjectType
		? T
		: T extends Record<string, unknown>
		? {
				[K in keyof T]-?: CompareConverter<T[K], BannedTypes>
		  }
		: NoUndefinedAndBannedTypes<T, BannedTypes>
	: NoUndefinedAndBannedTypes<T, BannedTypes>

type ArrayWriteConverter<T, BannedTypes> = NoDirectNestedArray<T> extends T
	? T extends (infer A)[]
		? ArrayWriteConverter<A, BannedTypes>[]
		: T extends FieldValues
		? ErrorFieldValueInArray
		: T extends FirelordFirestore.Timestamp | Date
		? FirelordFirestore.Timestamp | Date
		: T extends PossiblyReadAsUndefined
		? never
		: T extends NotTreatedAsObjectType
		? T
		: T extends Record<string, unknown>
		? {
				[K in keyof T]-?: ArrayWriteConverter<T[K], BannedTypes>
		  }
		: NoUndefinedAndBannedTypes<T, BannedTypes>
	: NoUndefinedAndBannedTypes<T, BannedTypes>

type WriteConverter<T, BannedTypes> = NoDirectNestedArray<T> extends T
	? T extends (infer A)[]
		?
				| ArrayWriteConverter<A, BannedTypes>[]
				| ArrayUnionOrRemove<ArrayWriteConverter<A, BannedTypes>>
		: T extends ServerTimestamp
		? ServerTimestamp
		: T extends number
		? number extends T
			? T | Increment
			: T
		: T extends DeleteField
		? DeleteField
		: T extends UnassignedAbleFieldValue
		? ErrorUnassignedAbleFieldValue
		: T extends FirelordFirestore.Timestamp | Date
		? FirelordFirestore.Timestamp | Date
		: T extends PossiblyReadAsUndefined
		? never
		: T extends NotTreatedAsObjectType
		? T
		: T extends Record<string, unknown>
		? {
				[K in keyof T]-?: WriteConverter<T[K], BannedTypes>
		  }
		: NoUndefinedAndBannedTypes<T, BannedTypes>
	: NoUndefinedAndBannedTypes<T, BannedTypes>