
import './App.css'
import './index.css'
import { RouterProvider, ScrollRestoration } from 'react-router-dom'
import router from "./router"
function App() {

  return <RouterProvider router={router}>
    <ScrollRestoration/>
  </RouterProvider>
}

export default App
