import React, { useState } from 'react';
import './styles/globals.css';
import {
  Button,
  Input,
  Card,
  Badge,
  Avatar,
  Modal,
  Toast,
  Tabs,
  Accordion,
  Select,
  Navbar,
  Sidebar,
  Divider,
  Alert,
} from './components';

function App() {
  // State management
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState('success');
  const [email, setEmail] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [activeNavItem, setActiveNavItem] = useState('dashboard');

  // Sample data
  const navItems = [
    { label: 'Dashboard', href: '#', active: activeNavItem === 'dashboard', id: 'dashboard' },
    { label: 'Campanhas', href: '#', active: activeNavItem === 'campaigns', id: 'campaigns' },
    { label: 'Leads', href: '#', active: activeNavItem === 'leads', id: 'leads' },
    { label: 'Relatorios', href: '#', active: activeNavItem === 'reports', id: 'reports' },
  ];

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'campaigns', label: 'Campanhas', icon: '📢' },
    { id: 'earnings', label: 'Ganhos', icon: '💰' },
    { id: 'settings', label: 'Configurações', icon: '⚙️' },
  ];

  const tabItems = [
    {
      label: 'Ativo',
      icon: '✓',
      content: (
        <div className="space-y-4">
          <h3 className="text-heading-sm font-semibold">Campanhas Ativas</h3>
          <Card hoverable>
            <p className="text-body-md">Você tem 3 campanhas ativas gerando leads</p>
            <Badge variant="success" className="mt-3">Operacional</Badge>
          </Card>
        </div>
      ),
    },
    {
      label: 'Pendente',
      icon: '⏳',
      content: (
        <div className="space-y-4">
          <h3 className="text-heading-sm font-semibold">Pendente Análise</h3>
          <Card hoverable>
            <p className="text-body-md">1 campanha aguardando aprovação</p>
            <Badge variant="warning" className="mt-3">Revisar</Badge>
          </Card>
        </div>
      ),
    },
    {
      label: 'Completado',
      icon: '✔️',
      content: (
        <div className="space-y-4">
          <h3 className="text-heading-sm font-semibold">Campanhas Completadas</h3>
          <Card hoverable>
            <p className="text-body-md">Total de 12 campanhas completadas este mês</p>
            <Badge variant="neutral" className="mt-3">Histórico</Badge>
          </Card>
        </div>
      ),
    },
  ];

  const accordionItems = [
    {
      label: 'Como funciona FastLead?',
      content: (
        <p className="text-body-md">
          FastLead é uma plataforma inovadora que permite exibir anúncios em tablets instalados em táxis.
          Motoristas recebem renda extra, e anunciantes conseguem leads qualificados.
        </p>
      ),
    },
    {
      label: 'Quanto ganho por lead?',
      content: (
        <p className="text-body-md">
          O valor varia de R$ 2 a R$ 10 por lead, dependendo do segmento do anunciante e da qualidade
          da campanha. Quanto melhor o QR scan, maior a remuneração.
        </p>
      ),
    },
    {
      label: 'Como recebo meu pagamento?',
      content: (
        <p className="text-body-md">
          Pagamentos são processados toda última segunda-feira de cada mês via PIX para sua conta
          bancária registrada.
        </p>
      ),
    },
  ];

  const selectOptions = [
    { value: 'ufc', label: 'Uber Food & Commerce' },
    { value: 'realestate', label: 'Imóveis' },
    { value: 'fintech', label: 'Fintech' },
    { value: 'ecommerce', label: 'E-commerce' },
  ];

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Sidebar */}
      <Sidebar
        items={sidebarItems}
        activeItem="overview"
        onItemClick={(id) => console.log('Clicked:', id)}
        footer={
          <div className="text-center">
            <Badge variant="secondary" size="sm">
              Premium
            </Badge>
          </div>
        }
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <Navbar
          title="FastLead Dashboard"
          items={navItems}
          sticky
          rightContent={
            <div className="flex items-center gap-4">
              <Avatar initials="JD" size="md" status="online" />
            </div>
          }
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Hero Section */}
            <section className="bg-gradient-primary rounded-lg p-8 text-white">
              <h1 className="text-display-lg font-display font-bold mb-2">
                Bem-vindo ao FastLead
              </h1>
              <p className="text-body-lg opacity-90">
                Ganhe dinheiro extra exibindo anúncios no seu táxi
              </p>
            </section>

            {/* Alerts */}
            <Alert
              type="success"
              title="Campanha Ativa"
              message="Você está gerando leads! Ganho atual: R$ 245,00"
              closable
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card padding="lg" shadow="elevation-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body-sm text-neutral-600 dark:text-neutral-400">
                      Ganho Este Mês
                    </p>
                    <p className="text-heading-lg font-bold mt-2">R$ 1.250</p>
                  </div>
                  <div className="text-3xl">💰</div>
                </div>
              </Card>

              <Card padding="lg" shadow="elevation-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body-sm text-neutral-600 dark:text-neutral-400">
                      QR Scans Hoje
                    </p>
                    <p className="text-heading-lg font-bold mt-2">47</p>
                  </div>
                  <div className="text-3xl">📱</div>
                </div>
              </Card>

              <Card padding="lg" shadow="elevation-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body-sm text-neutral-600 dark:text-neutral-400">
                      Campanhas Ativas
                    </p>
                    <p className="text-heading-lg font-bold mt-2">3</p>
                  </div>
                  <div className="text-3xl">📢</div>
                </div>
              </Card>
            </div>

            <Divider text="Recursos" />

            {/* Tabs */}
            <Card padding="lg">
              <Tabs tabs={tabItems} variant="default" onChange={setSelectedTab} />
            </Card>

            {/* Form Section */}
            <Card padding="lg" shadow="elevation-2">
              <h2 className="text-heading-md font-bold mb-6">
                Criar Nova Campanha
              </h2>

              <form className="space-y-6">
                <Input
                  label="Nome da Campanha"
                  placeholder="Ex: Promoção de Verão"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                />

                <Select
                  label="Segmento"
                  placeholder="Selecione um segmento"
                  options={selectOptions}
                  fullWidth
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Data Início"
                    type="date"
                  />
                  <Input
                    label="Data Fim"
                    type="date"
                  />
                </div>

                <Input
                  label="Budget (R$)"
                  type="number"
                  placeholder="0.00"
                  fullWidth
                />

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      setToastType('success');
                      setShowToast(true);
                    }}
                  >
                    Criar Campanha
                  </Button>
                  <Button variant="ghost" size="md">
                    Cancelar
                  </Button>
                </div>
              </form>
            </Card>

            {/* Accordion */}
            <Card padding="lg" shadow="elevation-1">
              <h2 className="text-heading-md font-bold mb-6">
                Dúvidas Frequentes
              </h2>
              <Accordion items={accordionItems} />
            </Card>

            {/* Component Showcase */}
            <Card padding="lg" shadow="elevation-1">
              <h2 className="text-heading-md font-bold mb-6">
                Componentes
              </h2>

              {/* Buttons */}
              <div className="space-y-4 mb-8">
                <h3 className="text-heading-sm font-semibold">Buttons</h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="success">Success</Button>
                </div>
              </div>

              {/* Badges */}
              <div className="space-y-4">
                <h3 className="text-heading-sm font-semibold">Badges</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="error">Error</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="info">Info</Badge>
                </div>
              </div>
            </Card>

            {/* Call to Action */}
            <Card
              padding="lg"
              shadow="elevation-2"
              className="bg-gradient-primary text-white text-center"
            >
              <h3 className="text-heading-md font-bold mb-4">
                Pronto para começar?
              </h3>
              <p className="text-body-md opacity-90 mb-6">
                Ative seu tablet agora e comece a ganhar dinheiro
              </p>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setToastType('info');
                  setShowToast(true);
                }}
              >
                Ativar Tablet
              </Button>
            </Card>
          </div>
        </main>
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Confirmar Ação"
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary">Confirmar</Button>
          </div>
        }
      >
        <p className="text-body-md">
          Tem certeza que deseja proceder com esta ação? Esta operação não pode ser desfeita.
        </p>
      </Modal>

      {/* Toast */}
      {showToast && (
        <Toast
          type={toastType}
          message={
            toastType === 'success'
              ? 'Campanha criada com sucesso!'
              : 'Operação realizada!'
          }
          position="bottom-right"
          duration={3000}
          onClose={() => setShowToast(false)}
          action={{
            label: 'Ver detalhes',
            onClick: () => console.log('View details'),
          }}
        />
      )}
    </div>
  );
}

export default App;
