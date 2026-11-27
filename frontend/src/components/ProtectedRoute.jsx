import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ClubsGridSkeleton, ClubPageSkeleton } from "./LoadingSkeletons";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    if (location.pathname.startsWith("/clubs/")) {
      return <ClubPageSkeleton />;
    }
    return (
      <div className="min-h-screen bg-gray-50 max-w-6xl mx-auto px-4 py-8">
        <ClubsGridSkeleton count={3} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
}
