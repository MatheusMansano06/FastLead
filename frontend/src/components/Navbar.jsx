import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Button from './Button';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="text-2xl font-bold text-primary-600">
              ⚡
            </div>
            <h1 className="text-heading-sm font-display text-primary-900 dark:text-primary-100">
              FastLead
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="hidden sm:flex flex-col items-end">
                  <p className="text-body-md font-medium text-neutral-900 dark:text-neutral-50">
                    {user.email}
                  </p>
                  <p className="text-body-sm text-neutral-500 dark:text-neutral-400">
                    Anunciante
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={handleLogout}
                >
                  Sair
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
