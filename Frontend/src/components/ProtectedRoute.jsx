import { Navigate } from "react-router-dom";

function ProtectedRoute({
  children
}) {
  const user =
    JSON.parse(
      localStorage.getItem(
        "user"
      )
    );

  const token =
    localStorage.getItem(
      "accessToken"
    );

  if (
    !user ||
    !token ||
    !user.isAdmin
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;