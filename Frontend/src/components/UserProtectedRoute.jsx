import { Navigate } from "react-router-dom";

function UserProtectedRoute({ children }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const token = sessionStorage.getItem("accessToken");

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default UserProtectedRoute;
