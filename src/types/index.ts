import { UserRole } from './user'

export type JSObject<T> = { [index: string]: T }

export type ActivityLog = {
  action: string
  uid: string
  role: UserRole
  data: JSObject<any>
  datetime: number
}