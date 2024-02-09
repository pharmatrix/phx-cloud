import { ActionRecord, Contacts, Location, PackagePer, PaymentTransaction } from '.'

export type TenantType = 'pharmacy' | 'hospital'
export type Tenant = {
  type: TenantType
  id: string
  name: string
  logo: string
  contacts: Contacts
  location: Location
  licenseNumber: string
  registered: ActionRecord
}

export type DeviceSession = {
  name: string
  avatar: string
  lastConnection: number
  datetime: number
}
export type Device = {
  id: string
  tenantId: string
  branchId: string
  os: string
  version: string
  model: string
  mac: string
  lastIP: string
  sessions: DeviceSession[]
  activation: {
    code: string
    expiry: number
  }
  added: ActionRecord
}
export type Branch = {
  id: string
  tenantId: string
  name: string
  location: Location
  contacts: Contacts
  created: ActionRecord
}

export type Subscription = {
  reference: string
  tenantId: string
  ptype: string
  per: PackagePer
  duration: {
    start: number
    end: number
  }
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED'
  payment: PaymentTransaction
  subscribed: ActionRecord
}