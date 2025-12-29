import { initializeApp } from 'firebase/app'
import {
  Database,
  DataSnapshot,
  endAt,
  equalTo,
  get,
  getDatabase,
  limitToLast,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set
} from 'firebase/database'

type FirebaseEnvConfig = {
  apiKey: string
  authDomain: string
  databaseURL: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
  measurementId?: string
}

type VisitorCount = number

export type Signature = {
  id: string
  name: string
  signature: string
  timestamp: string
}

type RawSignature = Omit<Signature, 'id'>

export type CursorData = {
  x?: number
  y?: number
  color?: string
  name?: string
  lastSeen?: number
  state?: 'active' | 'idle'
  [key: string]: unknown
}

type UseReactionCount = number

type PopularTool = {
  index: number
  count: number
}

type Unsubscribe = () => void

export type CursorWithId = {
  id: string
  name?: string
  color?: string
  x?: number
  y?: number
  lastSeen?: number
  state?: 'active' | 'idle'
}

const appConfig: FirebaseEnvConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL as string,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env
    .NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

export const PAGE_SIZE = 10

const app = initializeApp(appConfig)
const database: Database = getDatabase(app)

export const getVisitorCount = async (slug: string): Promise<VisitorCount> => {
  const refPath = ref(database, `blog/${slug}`)
  const snapshot: DataSnapshot = await get(refPath)
  if (snapshot.exists()) {
    return snapshot.val() as VisitorCount
  }
  return 0
}

export const incrementVisitorCount = async (slug: string): Promise<void> => {
  const visitorRef = ref(database, `blog/${slug}`)
  await runTransaction(visitorRef, current => {
    if (current === null) {
      return 1
    }
    return (current as number) + 1
  })
}

export const saveSignature = async (
  signatureBase64: string,
  userName: string
): Promise<void> => {
  const signaturesRef = ref(database, 'signatures')
  const payload: RawSignature = {
    name: userName,
    signature: signatureBase64,
    timestamp: new Date().toISOString()
  }
  await push(signaturesRef, payload)
}

const mapSnapshotToSignatures = (snapshot: DataSnapshot): Signature[] => {
  if (!snapshot.exists()) return []
  const val = snapshot.val() as Record<string, RawSignature>
  return Object.keys(val).map(key => ({
    id: key,
    ...val[key]
  }))
}

export const getAllSignatures = async (): Promise<Signature[]> => {
  const signaturesRef = ref(database, 'signatures')
  const snapshot: DataSnapshot = await get(signaturesRef)
  const list = mapSnapshotToSignatures(snapshot)
  return list
}

export const getLatestSignatures = async (
  pageSize: number = PAGE_SIZE
): Promise<Signature[]> => {
  const signaturesRef = ref(database, 'signatures')
  const q = query(
    signaturesRef,
    orderByChild('timestamp'),
    limitToLast(pageSize)
  )
  const snapshot: DataSnapshot = await get(q)
  const list = mapSnapshotToSignatures(snapshot)
  return list.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

export const getMoreSignatures = async (
  lastTimestamp: string,
  pageSize: number = PAGE_SIZE
): Promise<Signature[]> => {
  const signaturesRef = ref(database, 'signatures')
  const q = query(
    signaturesRef,
    orderByChild('timestamp'),
    endAt(lastTimestamp),
    limitToLast(pageSize + 1)
  )
  const snapshot: DataSnapshot = await get(q)
  const list = mapSnapshotToSignatures(snapshot).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
  return list.filter(sig => sig.timestamp !== lastTimestamp)
}

export const subscribeSignaturesPage = (
  callback: (list: Signature[]) => void,
  pageSize: number = PAGE_SIZE
): Unsubscribe => {
  const signaturesRef = ref(database, 'signatures')
  const q = query(
    signaturesRef,
    orderByChild('timestamp'),
    limitToLast(pageSize)
  )
  const unsubscribe = onValue(q, snapshot => {
    const list = mapSnapshotToSignatures(snapshot)
    const sorted = list.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    callback(sorted)
  })
  return unsubscribe
}

export const deleteSignatureByName = async ({
  name
}: {
  name: string
}): Promise<void> => {
  const signaturesRef = ref(database, 'signatures')
  const q = query(signaturesRef, orderByChild('name'), equalTo(name))
  const snapshot: DataSnapshot = await get(q)
  if (snapshot.exists()) {
    const raw = snapshot.val() as Record<string, RawSignature>
    const signaturesToDelete = Object.keys(raw)
    await Promise.all(
      signaturesToDelete.map(key => remove(ref(database, `signatures/${key}`)))
    )
  }
}

export const subscribeVisitorCount = (
  slug: string,
  callback: (count: VisitorCount) => void
): Unsubscribe => {
  const refPath = ref(database, `blog/${slug}`)
  const unsubscribe = onValue(refPath, snapshot => {
    if (!snapshot.exists()) {
      callback(0)
      return
    }
    callback(snapshot.val() as VisitorCount)
  })
  return unsubscribe
}

export const incrementTotalVisitors = async (): Promise<void> => {
  const totalRef = ref(database, 'analytics/total_visitors')
  await runTransaction(totalRef, current => {
    if (current === null) return 1
    return (current as number) + 1
  })
}

export const subscribeTotalVisitors = (
  callback: (count: VisitorCount) => void
): Unsubscribe => {
  const totalRef = ref(database, 'analytics/total_visitors')
  const unsubscribe = onValue(totalRef, snapshot => {
    if (!snapshot.exists()) {
      callback(0)
      return
    }
    callback(snapshot.val() as VisitorCount)
  })
  return unsubscribe
}

export const updateCursor = (
  room: string,
  userId: string,
  data: CursorData
): Promise<void> => {
  const cursorRef = ref(database, `cursors/${room}/${userId}`)
  return set(cursorRef, {
    ...data,
    lastSeen: serverTimestamp()
  })
}

export const filterActiveCursors = (
  cursors: CursorWithId[],
  selfId: string | null
): CursorWithId[] => {
  return cursors.filter(item => item.id !== selfId)
}

export const subscribeCursors = (
  room: string,
  callback: (data: Record<string, CursorData> | null) => void
): Unsubscribe => {
  const cursorsRef = ref(database, `cursors/${room}`)
  const unsubscribe = onValue(cursorsRef, snapshot => {
    if (!snapshot.exists()) {
      callback(null)
      return
    }
    callback(snapshot.val() as Record<string, CursorData>)
  })
  return unsubscribe
}

export const removeCursor = (room: string, userId: string): Promise<void> => {
  const cursorRef = ref(database, `cursors/${room}/${userId}`)
  return remove(cursorRef)
}

export const subscribeUseReaction = (
  section: string,
  index: number,
  callback: (count: UseReactionCount) => void
): Unsubscribe => {
  const refPath = ref(database, `uses_reactions/${section}/${index}`)
  const unsubscribe = onValue(refPath, snapshot => {
    if (!snapshot.exists()) {
      callback(0)
      return
    }
    callback(snapshot.val() as UseReactionCount)
  })
  return unsubscribe
}

export const incrementUseReaction = async (
  section: string,
  index: number
): Promise<void> => {
  const reactionRef = ref(database, `uses_reactions/${section}/${index}`)
  await runTransaction(reactionRef, current => {
    if (current === null) return 1
    return (current as number) + 1
  })
}

export const subscribePopularUseTools = (
  section: string,
  callback: (tools: PopularTool[]) => void
): Unsubscribe => {
  const refPath = ref(database, `uses_reactions/${section}`)
  const unsubscribe = onValue(refPath, snapshot => {
    if (!snapshot.exists()) {
      callback([])
      return
    }
    const val = snapshot.val() as Record<string, UseReactionCount>
    const tools: PopularTool[] = Object.entries(val)
      .map(([index, count]) => ({
        index: parseInt(index, 10),
        count: count as UseReactionCount
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    callback(tools)
  })
  return unsubscribe
}
