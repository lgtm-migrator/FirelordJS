import { MetaType } from './metaTypeCreator'
import { FirelordFirestore } from './firelordFirestore'
import {
	ErrorLimitToLastOrderBy,
	ErrorWhereOrderByAndInEquality,
	ErrorWhereCompareValueMustBeArray,
	ErrorWhereOrderByEquality,
	ErrorWhereNotInArrayContainsAny,
	ErrorWhereNotInNotEqual,
	ErrorWhereArrayContainsArrayContainsAny,
	ErrorWhereInequalityOpStrSameField,
	ErrorWhereOnlyOneNotEqual,
	ErrorCursorTooManyArguments,
	ErrorWhereNoFreshEmptyArray,
} from './error'
import { IsSame, IsTrue } from './utils'
import {
	QueryConstraints,
	WhereConstraint,
	OrderByConstraint,
	CursorConstraint,
	LimitConstraint,
} from './queryConstraints'
import { Query, CollectionReference } from './ref'
import { GetCorrectDocumentIdBasedOnRef } from './fieldPath'
import { CursorType } from './cursor'

type Equal = '=='
type Greater = '>'
type Smaller = '<'
type GreaterEqual = '>='
type SmallerEqual = '<='
type Range = Greater | Smaller | Greater | GreaterEqual | SmallerEqual
type NotEqual = '!='
type NotIn = 'not-in'
type In = 'in'
type ArrayContains = 'array-contains'
type ArrayContainsAny = 'array-contains-any'
type InequalityOpStr = Range | NotEqual | NotIn
type ValueOfOptStr = Range | NotEqual | Equal
type ArrayOfOptStr = In | NotIn
type ValueOfOnlyArrayOptStr = ArrayContainsAny
type ElementOfOptStr = ArrayContains
IsTrue<
	IsSame<
		FirelordFirestore.WhereFilterOp,
		| InequalityOpStr
		| ValueOfOptStr
		| ArrayOfOptStr
		| ValueOfOnlyArrayOptStr
		| ElementOfOptStr
	>
>()

// If you include a filter with a range comparison (<, <=, >, >=), your first ordering must be on the same field
type ValidateOrderByAndInequalityWhere<
	T extends MetaType,
	AllQCs extends QueryConstraints<T>[]
> = GetFirstInequalityWhere<T, AllQCs> extends infer W
	? W extends WhereConstraint<T, string, InequalityOpStr, unknown>
		? GetFirstOrderBy<T, AllQCs> extends infer O
			? O extends OrderByConstraint<
					T,
					string,
					FirelordFirestore.OrderByDirection | undefined
			  >
				? IsSame<W['fieldPath'], O['fieldPath']> extends true
					? true
					: ErrorWhereOrderByAndInEquality<O['fieldPath'], W['fieldPath']>
				: true // orderBy not found
			: never // impossible route
		: true // inequality Where not found
	: never // impossible route

export type QueryConstraintLimitation<
	T extends MetaType,
	Q extends Query<T> | CollectionReference<T>,
	RestQCs extends QueryConstraints<T>[],
	PreviousQCs extends QueryConstraints<T>[],
	AllQCs extends QueryConstraints<T>[]
> = ValidateOrderByAndInequalityWhere<T, AllQCs> extends string
	? ValidateOrderByAndInequalityWhere<T, AllQCs>
	: RestQCs extends [infer Head, ...infer Rest]
	? Rest extends QueryConstraints<T>[]
		? [
				Head extends LimitConstraint<'limit', number>
					? Head
					: Head extends OrderByConstraint<
							T,
							string,
							FirelordFirestore.OrderByDirection | undefined
					  >
					? OrderByConstraintLimitation<T, Head, AllQCs>
					: Head extends LimitConstraint<'limitToLast', number>
					? LimitToLastConstraintLimitation<T, Head, AllQCs>
					: Head extends WhereConstraint<
							T,
							string,
							FirelordFirestore.WhereFilterOp,
							unknown
					  >
					? WhereConstraintLimitation<T, Q, Head, PreviousQCs>
					: Head extends CursorConstraint<CursorType, unknown[]>
					? CursorConstraintLimitation<T, Head, PreviousQCs>
					: never, // impossible route
				...QueryConstraintLimitation<
					T,
					Q,
					Rest,
					Head extends QueryConstraints<T>
						? [...PreviousQCs, Head]
						: PreviousQCs, // impossible route
					AllQCs
				>
		  ]
		: never[] // impossible route
	: RestQCs // basically mean RestQCs is []

// Too many arguments provided to startAt(). The number of arguments must be less than or equal to the number of orderBy() clauses
type ValidateCursorOrderBy<
	Values extends unknown[],
	AllOrderFieldValue extends unknown[]
> = Values extends [infer Head, ...infer Rest]
	? AllOrderFieldValue extends [infer H, ...infer R]
		? [Head extends H ? Head : H, ...ValidateCursorOrderBy<Rest, R>]
		: [ErrorCursorTooManyArguments]
	: [] // end, Rest is []

type CursorConstraintLimitation<
	T extends MetaType,
	U extends CursorConstraint<CursorType, unknown[]>,
	PreviousQCs extends QueryConstraints<T>[]
> = U extends CursorConstraint<
	CursorType,
	ValidateCursorOrderBy<
		U['values'],
		GetAllOrderByFieldValue<T, PreviousQCs, []>
	>
>
	? U
	: ErrorCursorTooManyArguments

type LimitToLastConstraintLimitation<
	T extends MetaType,
	U extends LimitConstraint<'limitToLast', number>,
	AllQCs extends QueryConstraints<T>[]
> = AllQCs extends (infer A)[]
	? A extends QueryConstraints<T>
		? A['type'] extends 'orderBy'
			? U
			: ErrorLimitToLastOrderBy
		: never // impossible route
	: never // impossible route

// You can't order your query by a field included in an equality (==) or (in) clause.
type ValidateOrderByEqualityWhere<
	T extends MetaType,
	U extends OrderByConstraint<
		T,
		string,
		FirelordFirestore.OrderByDirection | undefined
	>,
	AllQCs extends QueryConstraints<T>[]
> = Extract<
	GetAllWhereConstraint<T, AllQCs, never>,
	WhereConstraint<T, U['fieldPath'], In | Equal, unknown>
> extends never
	? true
	: false

type OrderByConstraintLimitation<
	T extends MetaType,
	U extends OrderByConstraint<
		T,
		string,
		FirelordFirestore.OrderByDirection | undefined
	>,
	AllQCs extends QueryConstraints<T>[]
> = ValidateOrderByEqualityWhere<T, U, AllQCs> extends false
	? ErrorWhereOrderByEquality
	: U

// You can use at most one in, not-in, or array-contains-any clause per query. You can't combine in , not-in, and array-contains-any in the same query.
type ValidateWhereNotInArrayContainsAny<
	T extends MetaType,
	U extends WhereConstraint<
		T,
		string,
		FirelordFirestore.WhereFilterOp,
		unknown
	>,
	PreviousQCs extends QueryConstraints<T>[]
> = U['opStr'] extends In | NotIn | ArrayContainsAny
	? Extract<
			GetAllWhereConstraintOpStr<T, PreviousQCs, never>,
			In | NotIn | ArrayContainsAny
	  > extends never
		? true
		: ErrorWhereNotInArrayContainsAny
	: true

// You can't combine not-in with not equals !=.
// You cannot use more than one '!=' filter. (not documented directly or indirectly)
type ValidateWhereNotInNotEqual<
	T extends MetaType,
	U extends WhereConstraint<
		T,
		string,
		FirelordFirestore.WhereFilterOp,
		unknown
	>,
	PreviousQCs extends QueryConstraints<T>[]
> = U['opStr'] extends NotIn
	? Extract<
			GetAllWhereConstraintOpStr<T, PreviousQCs, never>,
			NotEqual
	  > extends never
		? true
		: ErrorWhereNotInNotEqual
	: U['opStr'] extends NotEqual
	? Extract<
			GetAllWhereConstraintOpStr<T, PreviousQCs, never>,
			NotIn
	  > extends never
		? Extract<
				GetAllWhereConstraintOpStr<T, PreviousQCs, never>,
				NotEqual
		  > extends never
			? true
			: ErrorWhereOnlyOneNotEqual
		: ErrorWhereNotInNotEqual
	: true

// You can use at most one array-contains clause per query. You can't combine array-contains with array-contains-any.
type ValidateWhereArrayContainsArrayContainsAny<
	T extends MetaType,
	U extends WhereConstraint<
		T,
		string,
		FirelordFirestore.WhereFilterOp,
		unknown
	>,
	PreviousQCs extends QueryConstraints<T>[]
> = U['opStr'] extends ArrayContains
	? Extract<
			GetAllWhereConstraintOpStr<T, PreviousQCs, never>,
			ArrayContains | ArrayContainsAny
	  > extends never
		? true
		: ErrorWhereArrayContainsArrayContainsAny
	: U['opStr'] extends ArrayContainsAny
	? Extract<
			GetAllWhereConstraintOpStr<T, PreviousQCs, never>,
			ArrayContains
	  > extends never
		? true
		: ErrorWhereArrayContainsArrayContainsAny
	: true

// In a compound query, range (<, <=, >, >=) and not equals (!=, not-in) comparisons must all filter on the same field.
type ValidateWhereInequalityOpStrSameField<
	T extends MetaType,
	U extends WhereConstraint<
		T,
		string,
		FirelordFirestore.WhereFilterOp,
		unknown
	>,
	PreviousQCs extends QueryConstraints<T>[]
> = U['opStr'] extends InequalityOpStr
	? Extract<
			GetAllWhereConstraint<T, PreviousQCs, never>,
			WhereConstraint<T, string, InequalityOpStr, unknown>
	  > extends never
		? true
		: Exclude<
				Extract<
					GetAllWhereConstraint<T, PreviousQCs, never>,
					WhereConstraint<T, string, InequalityOpStr, unknown>
				>,
				WhereConstraint<T, U['fieldPath'], InequalityOpStr, unknown>
		  > extends never
		? true
		: ErrorWhereInequalityOpStrSameField
	: true

type WhereConstraintLimitation<
	T extends MetaType,
	Q extends Query<T> | CollectionReference<T>,
	U extends WhereConstraint<
		T,
		string,
		FirelordFirestore.WhereFilterOp,
		unknown
	>,
	PreviousQCs extends QueryConstraints<T>[]
> = ValidateWhereNotInArrayContainsAny<T, U, PreviousQCs> extends string
	? ValidateWhereNotInArrayContainsAny<T, U, PreviousQCs>
	: ValidateWhereNotInNotEqual<T, U, PreviousQCs> extends string
	? ValidateWhereNotInNotEqual<T, U, PreviousQCs>
	: ValidateWhereArrayContainsArrayContainsAny<T, U, PreviousQCs> extends string
	? ValidateWhereArrayContainsArrayContainsAny<T, U, PreviousQCs>
	: ValidateWhereInequalityOpStrSameField<T, U, PreviousQCs> extends string
	? ValidateWhereInequalityOpStrSameField<T, U, PreviousQCs>
	: U['opStr'] extends ValueOfOptStr
	? WhereConstraint<
			T,
			U['fieldPath'],
			U['opStr'],
			GetCorrectDocumentIdBasedOnRef<T, Q, U['fieldPath'], U['value']>
	  >
	: U['opStr'] extends ArrayOfOptStr
	? WhereConstraint<
			T,
			U['fieldPath'],
			U['opStr'],
			U['value'] extends never[]
				? ErrorWhereNoFreshEmptyArray
				: U['value'] extends (infer P)[]
				? GetCorrectDocumentIdBasedOnRef<T, Q, U['fieldPath'], P>[]
				: ErrorWhereCompareValueMustBeArray<U['fieldPath']>
	  >
	: U['opStr'] extends ValueOfOnlyArrayOptStr
	? WhereConstraint<
			T,
			U['fieldPath'],
			U['opStr'],
			U['value'] extends never[]
				? ErrorWhereNoFreshEmptyArray
				: T['compare'][U['fieldPath']] extends (infer R)[]
				? T['compare'][U['fieldPath']]
				: ErrorWhereCompareValueMustBeArray<U['fieldPath']>
	  >
	: U['opStr'] extends ElementOfOptStr
	? WhereConstraint<
			T,
			U['fieldPath'],
			U['opStr'],
			T['compare'][U['fieldPath']] extends (infer R)[]
				? R
				: ErrorWhereCompareValueMustBeArray<U['fieldPath']>
	  >
	: never // impossible route

type GetFirstInequalityWhere<
	T extends MetaType,
	QCs extends QueryConstraints<T>[]
> = QCs extends [infer H, ...infer Rest]
	? H extends WhereConstraint<T, string, InequalityOpStr, unknown>
		? H
		: Rest extends QueryConstraints<T>[]
		? GetFirstInequalityWhere<T, Rest>
		: never // impossible route
	: true // not found, no check needed

type GetFirstOrderBy<
	T extends MetaType,
	QCs extends QueryConstraints<T>[]
> = QCs extends [infer H, ...infer Rest]
	? H extends OrderByConstraint<
			T,
			string,
			FirelordFirestore.OrderByDirection | undefined
	  >
		? H
		: Rest extends QueryConstraints<T>[]
		? GetFirstOrderBy<T, Rest>
		: never // impossible route
	: true // not found, no check needed

type GetAllOrderByFieldValue<
	T extends MetaType,
	QCs extends QueryConstraints<T>[],
	FieldValueTypeAcc extends unknown[]
> = QCs extends [infer H, ...infer Rest]
	? Rest extends QueryConstraints<T>[]
		? GetAllOrderByFieldValue<
				T,
				Rest,
				H extends OrderByConstraint<
					T,
					string,
					FirelordFirestore.OrderByDirection | undefined
				>
					? [...FieldValueTypeAcc, T['compare'][H['fieldPath']]]
					: FieldValueTypeAcc
		  >
		: [] // impossible route
	: FieldValueTypeAcc // not found, no check needed

type GetAllWhereConstraint<
	T extends MetaType,
	QCs extends QueryConstraints<T>[],
	WhereConstraintsAcc extends WhereConstraint<
		T,
		string,
		FirelordFirestore.WhereFilterOp,
		unknown
	>
> = QCs extends [infer H, ...infer R]
	? R extends QueryConstraints<T>[]
		?
				| WhereConstraintsAcc
				| GetAllWhereConstraint<
						T,
						R,
						| (H extends WhereConstraint<
								T,
								string,
								FirelordFirestore.WhereFilterOp,
								unknown
						  >
								? H
								: never)
						| WhereConstraintsAcc
				  >
		: WhereConstraintsAcc // R is []
	: WhereConstraintsAcc // QCs is []

type GetAllWhereConstraintOpStr<
	T extends MetaType,
	QCs extends QueryConstraints<T>[],
	OpStrAcc extends FirelordFirestore.WhereFilterOp
> = QCs extends [infer H, ...infer R]
	? R extends QueryConstraints<T>[]
		?
				| OpStrAcc
				| GetAllWhereConstraintOpStr<
						T,
						R,
						| (H extends WhereConstraint<
								T,
								string,
								FirelordFirestore.WhereFilterOp,
								unknown
						  >
								? H['opStr']
								: never)
						| OpStrAcc
				  >
		: OpStrAcc // R is []
	: OpStrAcc // QCs is []
