import { createBrowserRouter } from "react-router-dom";
import Home from "./pages/Home/Home";
import Menu from "./pages/Menu/Menu";
import Manage from "./pages/Manage/Manage";
import AdminLogin from "./pages/admin/AdminLogin";
import RequireAuth from "./components/RequireAuth";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Home />,
    },
    {
      path: "/menu",
      element: <Menu />,
    },
    {
      path: "/manage",
      element: (
        <RequireAuth>
          <Manage />
        </RequireAuth>
      ),
    },
    {
      path: "/admin",
      element: <AdminLogin />,
    },
  ],
  {
    // Vite's `base`, so the same build works at a domain root and under the
    // /menu/ subpath that GitHub Pages serves a project site from.
    basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/",
  }
);

export default router;
