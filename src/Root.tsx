import { Auth } from '@src/Auth'
import { AppStateProvider } from '@src/AppState'
import LspProvider from '@src/components/LspProvider'
import { OpenInDesktopAppHandler } from '@src/components/OpenInDesktopAppHandler'
import { SystemIOMachineLogicListener } from '@src/components/SystemIOMachineLogicListener'
import { RouteProvider } from '@src/components/RouteProvider'
import { Outlet } from 'react-router-dom'
import env from '@src/env'
import {
  createGibbsChatTransport,
  createGibbsHttpConversationStore,
} from '@src/lib/gibbs/api'
import {
  type GibbsChatInput,
  GibbsChatReactContext,
} from '@src/machines/gibbsChatMachine'
import {
  MockChatTransport,
  createInMemoryConversationStore,
} from '@src/mocks/gibbs'

function createGibbsChatInput(): GibbsChatInput {
  const apiUrl = env().VITE_GIBBS_API_URL
  return apiUrl
    ? {
        transport: createGibbsChatTransport(apiUrl),
        conversations: createGibbsHttpConversationStore(apiUrl),
      }
    : {
        transport: new MockChatTransport(),
        conversations: createInMemoryConversationStore(),
      }
}

const gibbsChatInput = createGibbsChatInput()

// Root component will live for the entire applications runtime
// This is a great place to add polling code.
function RootLayout() {
  return (
    <OpenInDesktopAppHandler>
      <RouteProvider>
        <Auth>
          {/* It's possible the ML agent will interact with the user
        on the project view or anywhere else in the app in the future. It should
        work regardless of the LSP or sketching being available, as users
        may simply want to ask it questions. */}
          <GibbsChatReactContext.Provider options={{ input: gibbsChatInput }}>
            <LspProvider>
              <AppStateProvider>
                <SystemIOMachineLogicListener />
                <Outlet />
              </AppStateProvider>
            </LspProvider>
          </GibbsChatReactContext.Provider>
        </Auth>
      </RouteProvider>
    </OpenInDesktopAppHandler>
  )
}

export default RootLayout
