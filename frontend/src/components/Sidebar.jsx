import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { icon: '📊', label: 'Dashboard', path: '/dashboard' },
    { icon: '📝', label: 'Criar Campanha', path: '/create-campaign' },
    { icon: '📋', label: 'Minhas Campanhas', path: '/campaigns' },
    { icon: '📞', label: 'Leads', path: '/leads' },
    { icon: '👤', label: 'Perfil', path: '/profile' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 w-64 min-h-screen sticky top-0">
      <div className="p-6">
        <h2 className="text-heading-sm font-display mb-8">Menu</h2>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                isActive(item.path)
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100 font-medium'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-body-md">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
