import { createBrowserRouter } from "react-router-dom";
import Home from "./pages/Home/Home";
import Menu from "./pages/Menu/Menu";
import Manage from "./pages/Manage/Manage";
import AdminLogin from "./pages/admin/AdminLogin";

const router = createBrowserRouter([
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
    element: <Manage />,
  },
  {
    path: "/admin",
    element: <AdminLogin/>,
  },
]);

export default router;