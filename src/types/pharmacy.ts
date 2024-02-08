import { ActionRecord } from '.'

export type Pharmacy = {
  id: string
  name: string
  logo: string
  contacts: {
    phones: string[]
    emails: string[]
  }
  licenceNumber: string
  created: ActionRecord
  updated?: ActionRecord
}

export type Branch = {
  pharmacyId: string
  name: string
  location: {
    country: string
    city: string
    address: string
  }
  contacts: {
    phones: string[]
    emails: string[]
  }
  added: ActionRecord
  updated?: ActionRecord
}