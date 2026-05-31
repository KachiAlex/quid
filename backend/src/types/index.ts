export interface User {
  user_id: string
  email: string
  email_verified_at: Date | null
  first_name: string | null
  last_name: string | null
  subscription_tier: 'free' | 'premium'
  mfa_enabled: boolean
  created_at: Date
}

export interface AuthenticatedRequest extends Request {
  user?: User
}
