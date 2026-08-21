import { App as AntdApp } from 'antd';
import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import ProductList from './pages/ProductList';
import ProductCategoryList from './pages/ProductCategoryList';
import CampaignList from './pages/CampaignList';
import UserList from './pages/UserList';
import WinningList from './pages/WinningList';
import Dashboard from './pages/Dashboard';
import LotteryRecords from './pages/LotteryRecords';
import Login from './pages/Login';
import { setAuthToken } from './lib/api';
import { BasicConfigPanel } from './pages/system-settings/BasicConfigPanel';
import { CheckinRewardsPanel } from './pages/system-settings/CheckinRewardsPanel';
import { InviteRewardsPanel } from './pages/system-settings/InviteRewardsPanel';
import SystemSettingsLayout from './pages/system-settings/SystemSettingsLayout';
import SmsManagement from './pages/SmsManagement';
import PaymentRecords from './pages/finance/PaymentRecords';
import TransactionRecords from './pages/finance/TransactionRecords';
import WithdrawalRecords from './pages/finance/WithdrawalRecords';

function App() {
  const [token, setTokenState] = useState<string | null>(() => {
    const saved = localStorage.getItem('admin_token');
    if (saved) {
      setAuthToken(saved);
    }
    return saved;
  });

  const handleLogout = () => {
    setAuthToken(null);
    setTokenState(null);
  };

  if (!token) {
    return (
      <AntdApp>
        <Login
          onLoginSuccess={() => {
            const saved = localStorage.getItem('admin_token');
            setTokenState(saved);
            setAuthToken(saved || null);
          }}
        />
      </AntdApp>
    );
  }

  return (
    <AntdApp>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Layout onLogout={handleLogout} />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductList />} />
          <Route path="product-categories" element={<ProductCategoryList />} />
          <Route path="campaigns" element={<CampaignList />} />
          <Route path="users" element={<UserList />} />
          <Route path="winnings" element={<WinningList />} />
          <Route path="promo-records" element={<LotteryRecords />} />
          <Route path="orders" element={<Navigate to="/promo-records" replace />} />
          <Route path="finance/payments" element={<PaymentRecords />} />
          <Route path="finance/transactions" element={<TransactionRecords />} />
          <Route path="finance/withdrawals" element={<WithdrawalRecords />} />
          <Route path="settings" element={<SystemSettingsLayout />}>
            <Route index element={<Navigate to="basic" replace />} />
            <Route path="basic" element={<BasicConfigPanel />} />
            <Route path="invite" element={<InviteRewardsPanel />} />
            <Route path="checkin" element={<CheckinRewardsPanel />} />
          </Route>
          <Route path="content" element={<Navigate to="/settings/invite" replace />} />
          <Route path="system/sms" element={<SmsManagement />} />
          <Route path="payments" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </AntdApp>
  );
}

export default App;
