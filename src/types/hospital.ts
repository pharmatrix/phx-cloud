import { Location, ActionRecord } from '.'

export type Hospital = {
  id: string
  name: string
  logo: string
  contacts: {
    phones: string[]
    emails: string[]
  }
  location: Location
  licenceNumber: string
  created: ActionRecord
  updated?: ActionRecord
}