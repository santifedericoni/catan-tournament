import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { TournamentDetail } from './pages/TournamentDetail';
import { TournamentCreate } from './pages/TournamentCreate';
import { TournamentManage } from './pages/TournamentManage';
import { UserProfile } from './pages/UserProfile';
import { LeagueCreate } from './pages/LeagueCreate';
import { LeagueDetail } from './pages/LeagueDetail';
import { CreatePicker } from './pages/CreatePicker';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/tournaments/:id" element={<TournamentDetail />} />
        <Route path="/leagues/:id" element={<LeagueDetail />} />
        <Route path="/profile/:id" element={<UserProfile />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/create" element={<CreatePicker />} />
          <Route path="/tournaments/create" element={<TournamentCreate />} />
          <Route path="/tournaments/:id/manage" element={<TournamentManage />} />
          <Route path="/leagues/create" element={<LeagueCreate />} />
        </Route>
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
