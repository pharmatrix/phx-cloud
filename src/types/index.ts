import { UserRole } from './user'

export type JSObject<T> = { [index: string]: T }
export type ActionRecord = {
  by: string
  at: number
}
export type Location = {
  country?: string
  city?: string
  address?: string
}
export type Contacts = {
  phones: string[]
  emails: string[]
}

export type ContextType = 'super' | 'pharmacy' | 'hospital'
export type Context = {
  type: ContextType
  role: UserRole
  id?: string
}

export type ActivityLog = {
  action: string
  uid: string
  context: Context
  data: JSObject<any>
  datetime: number
}

export type Invitation = {
  context: Context
  name: string
  email: string
  expiry: number
  added: ActionRecord
}

export type Printer = {
  enabled: boolean
  name: String
  model: string
  driverURL: string
  specs: {
    paperSize: string
    injection: boolean
    color: boolean
  }
  added: ActionRecord
}