import React, { ReactElement } from 'react'
import { render, RenderOptions, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../../contexts/AuthContext'
import { WebSocketProvider } from '../../contexts/WebSocketContext'
import userEvent from '@testing-library/user-event'

// Integration test render function with all providers
interface IntegrationRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
  queryClient?: QueryClient
  withAuth?: boolean
  withWebSocket?: boolean
  withRouter?: boolean
  user?: ReturnType<typeof userEvent.setup>
}

const createIntegrationQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
})

const IntegrationProviders = ({
  children,
  initialEntries = ['/'],
  queryClient,
  withAuth = true,
  withWebSocket = true,
  withRouter = true,
}: React.PropsWithChildren<IntegrationRenderOptions>) => {
  const client = queryClient || createIntegrationQueryClient()

  let Wrapper = ({ children: innerChildren }: React.PropsWithChildren<{}>) => <>{innerChildren}</>

  if (withWebSocket) {
    Wrapper = ({ children: innerChildren }) => (
      <WebSocketProvider>{innerChildren}</WebSocketProvider>
    )
  }

  if (withAuth) {
    const CurrentWrapper = Wrapper
    Wrapper = ({ children: innerChildren }) => (
      <CurrentWrapper>
        <AuthProvider>{innerChildren}</AuthProvider>
      </CurrentWrapper>
    )
  }

  if (withRouter) {
    const CurrentWrapper = Wrapper
    Wrapper = ({ children: innerChildren }) => (
      <CurrentWrapper>
        <BrowserRouter>{innerChildren}</BrowserRouter>
      </CurrentWrapper>
    )
  }

  return (
    <QueryClientProvider client={client}>
      <Wrapper>{children}</Wrapper>
    </QueryClientProvider>
  )
}

export const renderIntegration = (
  ui: ReactElement,
  options?: IntegrationRenderOptions,
) => {
  const user = userEvent.setup()
  const result = render(ui, { 
    wrapper: (props) => <IntegrationProviders {...props} {...options} />, 
    ...options 
  })
  
  return {
    ...result,
    user,
    waitFor,
  }
}

// Integration test helpers
export const waitForNavigation = async (timeout = 3000) => {
  await waitFor(() => {
    expect(window.location.pathname).not.toBe('/')
  }, { timeout })
}

export const waitForApiCall = async (mockFn: any, timeout = 3000) => {
  await waitFor(() => {
    expect(mockFn).toHaveBeenCalled()
  }, { timeout })
}

export * from '@testing-library/react'
export { userEvent }
