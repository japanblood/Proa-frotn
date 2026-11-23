import httpClient from './httpClient'

export const authApi = {
  login: async ({ numEmpleado, username, password }) => {
    const { data } = await httpClient.post('/auth/login', {
      numEmpleado: numEmpleado || username,
      password,
    })
    return data
  },
}