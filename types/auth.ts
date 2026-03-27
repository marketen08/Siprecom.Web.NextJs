export interface LoginRequest {
  email: string
  password: string
}

export interface BackendAuthResponse {
  accessToken: string
  refreshToken: string
}

export interface UserInfo {
  email: string
  roles: string[]
}

export interface LoginApiResponse {
  user: UserInfo
}
