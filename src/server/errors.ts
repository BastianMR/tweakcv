export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public detail?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
