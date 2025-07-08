import { GET } from '@/app/api/search/route'
import { searchDriversAction } from '@/app/data-actions'
import { NextRequest } from 'next/server'

// Mock the data actions
jest.mock('@/app/data-actions', () => ({
  searchDriversAction: jest.fn()
}))

const mockSearchDriversAction = searchDriversAction as jest.MockedFunction<typeof searchDriversAction>

describe('/api/search', () => {
  const jeffNoelDriver = {
    name: 'Jeff Noel',
    custId: 539129
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('successfully searches for Jeff Noel', async () => {
    mockSearchDriversAction.mockResolvedValue({
      data: [jeffNoelDriver],
      error: null
    })

    const request = new NextRequest('http://localhost:3000/api/search?q=Jeff%20Noel')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.drivers).toEqual([jeffNoelDriver])
    expect(data.query).toBe('Jeff Noel')
    expect(data.count).toBe(1)
    expect(data.timestamp).toBeDefined()
    expect(mockSearchDriversAction).toHaveBeenCalledWith('Jeff Noel')
  })

  test('returns error when query parameter is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/search')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Query parameter "q" is required')
    expect(mockSearchDriversAction).not.toHaveBeenCalled()
  })

  test('returns error when query is too short', async () => {
    const request = new NextRequest('http://localhost:3000/api/search?q=J')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Query must be at least 2 characters long')
    expect(mockSearchDriversAction).not.toHaveBeenCalled()
  })

  test('handles search action error', async () => {
    mockSearchDriversAction.mockResolvedValue({
      data: [],
      error: 'Search service unavailable'
    })

    const request = new NextRequest('http://localhost:3000/api/search?q=Jeff%20Noel')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Search service unavailable')
    expect(mockSearchDriversAction).toHaveBeenCalledWith('Jeff Noel')
  })

  test('handles unexpected errors gracefully', async () => {
    mockSearchDriversAction.mockRejectedValue(new Error('Database connection failed'))

    const request = new NextRequest('http://localhost:3000/api/search?q=Jeff%20Noel')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
    expect(mockSearchDriversAction).toHaveBeenCalledWith('Jeff Noel')
  })

  test('handles empty search results', async () => {
    mockSearchDriversAction.mockResolvedValue({
      data: [],
      error: null
    })

    const request = new NextRequest('http://localhost:3000/api/search?q=NonExistentDriver')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.drivers).toEqual([])
    expect(data.query).toBe('NonExistentDriver')
    expect(data.count).toBe(0)
    expect(data.timestamp).toBeDefined()
    expect(mockSearchDriversAction).toHaveBeenCalledWith('NonExistentDriver')
  })

  test('handles URL encoded query parameters', async () => {
    mockSearchDriversAction.mockResolvedValue({
      data: [jeffNoelDriver],
      error: null
    })

    const request = new NextRequest('http://localhost:3000/api/search?q=Jeff%20Noel%20Jr.')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.query).toBe('Jeff Noel Jr.')
    expect(mockSearchDriversAction).toHaveBeenCalledWith('Jeff Noel Jr.')
  })
})
