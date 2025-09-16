export interface HomepageSection {
  section: string
  title: string
  subtitle: string
  data: any
  order: number
  isActive: boolean
}

export interface HomepageResponse {
  success: boolean
  data: HomepageSection[]
}
