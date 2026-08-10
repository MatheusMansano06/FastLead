import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, homePathFor } from './stores/authStore';

/**
 * Tudo entra por lazy import de propósito.
 *
 * O tablet do carro e a landing de captura do passageiro rodam em aparelho
 * fraco e 4G ruim — com o split cada rota baixa só o seu chunk, sem arrastar o
 * peso das telas de painel.
 */

// Público
const Landing = lazy(() => import('./pages/Landing'));

// Tablet do carro + landing de captura do passageiro (as mais leves)
const Tablet = lazy(() => import('./pages/Tablet'));
const LeadCapture = lazy(() => import('./pages/LeadCapture'));

// Auth (persona-aware)
const AccessHub = lazy(() => import('./pages/auth/AccessHub'));
const LoginEmpresa = lazy(() => import('./pages/auth/LoginEmpresa'));
const LoginMotorista = lazy(() => import('./pages/auth/LoginMotorista'));
const CadastroEmpresa = lazy(() => import('./pages/auth/CadastroEmpresa'));
const CadastroMotorista = lazy(() => import('./pages/auth/CadastroMotorista'));

// Áreas logadas
const HomeEmpresa = lazy(() => import('./pages/app/HomeEmpresa'));
const HomeMotorista = lazy(() => import('./pages/app/HomeMotorista'));
const PerfilMotorista = lazy(() => import('./pages/app/PerfilMotorista'));

// MASTER (visão global de todas as empresas e motoristas)
const Master = lazy(() => import('./pages/Master'));

// Páginas antigas do anunciante
const CreateCampaign = lazy(() => import('./pages/CreateCampaign'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const Leads = lazy(() => import('./pages/Leads'));
const Profile = lazy(() => import('./pages/Profile'));

// Fundo navy enquanto o chunk da rota chega — evita flash branco no tablet.
const RouteFallback = () => <div className="min-h-screen bg-ink" />;

// Guards
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/entrar" replace />;
};

// O painel MASTER agrega TODAS as empresas — um anunciante logado não pode cair
// aqui nem por engano, então checamos o tipo além do login.
const MasterRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/entrar" replace />;
  if (user?.type !== 'admin') return <Navigate to={homePathFor(user?.type)} replace />;
  return children;
};

// Sends an authenticated user to their persona home.
const HomeRedirect = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/entrar" replace />;
  return <Navigate to={homePathFor(user?.type)} replace />;
};

const App = () => {
  return (
    <Router>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public landing */}
        <Route path="/" element={<Landing />} />

        {/* Tablet do carro — sem login, autentica por device token */}
        <Route path="/tablet" element={<Tablet />} />

        {/* Landing que o passageiro vê depois de escanear o QR */}
        <Route path="/lp/:campaignId" element={<LeadCapture />} />

        {/* Access hubs */}
        <Route path="/entrar" element={<AccessHub mode="login" />} />
        <Route path="/cadastro" element={<AccessHub mode="cadastro" />} />

        {/* Persona logins */}
        <Route path="/entrar/empresa" element={<LoginEmpresa />} />
        <Route path="/entrar/motorista" element={<LoginMotorista />} />

        {/* Persona registers */}
        <Route path="/cadastro/empresa" element={<CadastroEmpresa />} />
        <Route path="/cadastro/motorista" element={<CadastroMotorista />} />

        {/* Persona homes */}
        <Route path="/app/empresa" element={<ProtectedRoute><HomeEmpresa /></ProtectedRoute>} />
        <Route path="/app/motorista" element={<ProtectedRoute><HomeMotorista /></ProtectedRoute>} />
        <Route path="/app/motorista/perfil" element={<ProtectedRoute><PerfilMotorista /></ProtectedRoute>} />

        {/* Painel MASTER */}
        <Route path="/master" element={<MasterRoute><Master /></MasterRoute>} />

        {/* Advertiser sub-pages */}
        <Route path="/create-campaign" element={<ProtectedRoute><CreateCampaign /></ProtectedRoute>} />
        <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Back-compat redirects */}
        <Route path="/login" element={<Navigate to="/entrar" replace />} />
        <Route path="/register" element={<Navigate to="/cadastro" replace />} />
        <Route path="/dashboard" element={<HomeRedirect />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
