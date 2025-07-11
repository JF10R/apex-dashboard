import '@testing-library/jest-dom'

// Polyfill for Next.js APIs
global.Request = global.Request || 
  class Request {
    constructor(input, options = {}) {
      this.url = input
      this.method = options.method || 'GET'
      this.headers = new Headers(options.headers)
      this.body = options.body
    }
  }

global.Response = global.Response || 
  class Response {
    constructor(body, options = {}) {
      this.body = body
      this.status = options.status || 200
      this.statusText = options.statusText || 'OK'
      this.headers = new Headers(options.headers)
    }
    
    static json(body, options = {}) {
      return new Response(JSON.stringify(body), {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })
    }
  }

global.Headers = global.Headers || 
  class Headers {
    constructor(init = {}) {
      this.map = new Map()
      if (init) {
        Object.entries(init).forEach(([key, value]) => {
          this.map.set(key.toLowerCase(), value)
        })
      }
    }
    
    get(name) {
      return this.map.get(name.toLowerCase())
    }
    
    set(name, value) {
      this.map.set(name.toLowerCase(), value)
    }
  }

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useParams: () => ({
    custId: '539129',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body, options = {}) => ({
      json: () => Promise.resolve(body),
      status: options.status || 200,
      body: JSON.stringify(body),
      headers: new Headers(options.headers),
    }),
  },
  NextRequest: class NextRequest {
    constructor(input, options = {}) {
      this.url = input
      this.method = options.method || 'GET'
      this.headers = new Headers(options.headers)
      this.body = options.body
      
      // Parse URL for search params
      const url = new URL(input)
      this.nextUrl = {
        search: url.search,
        searchParams: url.searchParams,
        pathname: url.pathname,
      }
    }
    
    json() {
      return Promise.resolve(JSON.parse(this.body || '{}'))
    }
    
    text() {
      return Promise.resolve(this.body || '')
    }
  },
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ArrowLeft: 'div',
  Search: 'div',
  Star: 'div',
  Award: 'div',
  ShieldAlert: 'div',
  Timer: 'div',
  Users: 'div',
  Loader2: 'div',
  Sun: 'div',
  Moon: 'div',
  RefreshCw: 'div',
  Clock: 'div',
  ChevronDown: 'div',
  Check: 'div',
  X: 'div',
  Calendar: 'div',
  TrendingUp: 'div',
  TrendingDown: 'div',
  Minus: 'div',
  Plus: 'div',
  Settings: 'div',
  Home: 'div',
  BarChart3: 'div',
  Trophy: 'div',
  Zap: 'div',
  Target: 'div',
  Activity: 'div',
  Flag: 'div',
}))

// Mock fetch globally
global.fetch = jest.fn()

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = jest.fn()
