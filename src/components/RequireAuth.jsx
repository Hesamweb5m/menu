import { Navigate } from "react-router-dom";
import { isLoggedIn } from "../services/auth";

/**
 * Route guard for the admin panel. The backend independently rejects every
 * unauthenticated write, so this is a navigation convenience rather than the
 * security boundary.
 */
const RequireAuth = ({ children }) => {
  if (!isLoggedIn()) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default RequireAuth;
