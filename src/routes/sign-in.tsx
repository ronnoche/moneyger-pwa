import { Navigate, useLocation } from 'react-router';

/** Legacy /sign-in URLs redirect to the landing at `/` with the same query string. */
export default function SignInRedirect() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/', search }} replace />;
}
