import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  Route,
  RouterProvider,
  createMemoryRouter,
  createRoutesFromElements,
} from 'react-router-dom'

import UserSidebarMenu from '@src/components/UserSidebarMenu'
import type { AppUser } from '@src/lib/auth'
import { expect, describe, test, vi } from 'vitest'

describe('UserSidebarMenu tests', () => {
  test("Renders user's name and email if available", async () => {
    const userWellFormed: AppUser = {
      id: '8675309',
      name: 'Test User',
      email: 'kittycad.sidebar.test@example.com',
      imageUrl: 'https://placekitten.com/200/200',
    }

    render(
      <TestWrap>
        <UserSidebarMenu user={userWellFormed} />
      </TestWrap>
    )

    fireEvent.click(screen.getByTestId('user-sidebar-toggle'))

    await waitFor(() => {
      expect(screen.getByTestId('username')).toHaveTextContent(
        userWellFormed.name || ''
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('email')).toHaveTextContent(
        userWellFormed.email ?? ''
      )
    })
  })

  test("Renders just the user's email if no name is available", async () => {
    const userNoName: AppUser = {
      id: '8675309',
      name: '',
      email: 'kittycad.sidebar.test@example.com',
      imageUrl: 'https://placekitten.com/200/200',
    }

    render(
      <TestWrap>
        <UserSidebarMenu user={userNoName} />
      </TestWrap>
    )

    fireEvent.click(screen.getByTestId('user-sidebar-toggle'))

    await waitFor(() => {
      expect(screen.getByTestId('username')).toHaveTextContent(
        userNoName.email ?? ''
      )
    })
  })

  test('Renders a menu button if no user avatar is available', async () => {
    const userNoAvatar: AppUser = {
      id: '8675309',
      name: 'Test User',
      email: 'kittycad.sidebar.test@example.com',
    }

    render(
      <TestWrap>
        <UserSidebarMenu user={userNoAvatar} />
      </TestWrap>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user-sidebar-toggle')).toHaveTextContent(
        'User menu'
      )
    })
  })
})

function TestWrap({ children }: { children: React.ReactNode }) {
  // wrap in router and xState context
  // We have to use a memory router in the testing environment,
  // and we have to use the createMemoryRouter function instead of <MemoryRouter /> as of react-router v6.4
  const router = createMemoryRouter(
    createRoutesFromElements(
      <Route path="/file/:id" element={<>{children}</>} />
    ),
    {
      initialEntries: ['/file/new'],
      initialIndex: 0,
    }
  )
  return <RouterProvider router={router} />
}
