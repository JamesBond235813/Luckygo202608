import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Categories from './pages/Categories';
import ProductDetails from './pages/ProductDetails';
import { BottomNav } from './components/BottomNav';
import History from './pages/History';
import Winnings from './pages/Winnings';
import Me from './pages/Me';
import Wallet from './pages/Wallet';
import WalletPaymentWebView from './pages/WalletPaymentWebView';
import WalletPaymentReturn from './pages/WalletPaymentReturn';
import Transactions from './pages/Transactions';
import Participation from './pages/Participation';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Login from './pages/Login';
import InviteRewards from './pages/InviteRewards';
import { UserProfileProvider } from './context/UserProfileContext';
import { AgeComplianceProvider } from './context/AgeComplianceContext';
import { AgeComplianceOverlays } from './components/age/AgeComplianceOverlays';
import ResponsibleGaming from './pages/ResponsibleGaming';
import HelpCenter from './pages/HelpCenter';
import TermsPrivacy from './pages/TermsPrivacy';
import Rewards from './pages/Rewards';
import { AntdMobileProvider } from './providers/AntdMobileProvider';
import { ScrollToTop } from './components/ScrollToTop';

const withBottomNav = (node: React.ReactNode) => (
    <>
        {node}
        <BottomNav />
    </>
);

function App() {
    const [loginRequest, setLoginRequest] = useState<{ from: string } | null>(null);

    useEffect(() => {
        const applyTheme = () => {
            document.documentElement.classList.toggle('dark', localStorage.getItem('luckygo_dark_mode') === '1');
        };
        applyTheme();
        window.addEventListener('storage', applyTheme);
        window.addEventListener('luckygo-theme-change', applyTheme);
        return () => {
            window.removeEventListener('storage', applyTheme);
            window.removeEventListener('luckygo-theme-change', applyTheme);
        };
    }, []);

    useEffect(() => {
        const openLogin = (event: Event) => {
            const from = (event as CustomEvent<{ from?: string }>).detail?.from || '/';
            setLoginRequest({ from });
        };
        window.addEventListener('luckygo-open-login', openLogin);
        return () => window.removeEventListener('luckygo-open-login', openLogin);
    }, []);

    return (
        <BrowserRouter>
            <ScrollToTop />
            <AntdMobileProvider>
                <UserProfileProvider>
                    <AgeComplianceProvider>
                        <AgeComplianceOverlays />
                        {loginRequest ? (
                            <Login modal from={loginRequest.from} onClose={() => setLoginRequest(null)} />
                        ) : null}
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Login />} />
                            <Route path="/" element={withBottomNav(<Home />)} />
                            <Route path="/categories" element={withBottomNav(<Categories />)} />
                            <Route path="/categories/:categoryId" element={<Navigate to="/categories" replace />} />
                            <Route path="/product-details/:id" element={<ProductDetails />} />
                            <Route path="/history" element={withBottomNav(<History />)} />
                            <Route path="/me" element={withBottomNav(<Me />)} />
                            <Route path="/winnings" element={<Winnings />} />
                            <Route path="/wallet" element={<Wallet />} />
                            <Route path="/wallet/pay" element={<WalletPaymentWebView />} />
                            <Route path="/wallet/pay/return" element={<WalletPaymentReturn />} />
                            <Route path="/transactions" element={<Transactions />} />
                            <Route path="/participation" element={<Participation />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/notifications" element={<Notifications />} />
                            <Route path="/invite" element={<InviteRewards />} />
                            <Route path="/rewards" element={<Rewards />} />
                            <Route path="/responsible-gaming" element={<ResponsibleGaming />} />
                            <Route path="/help" element={<HelpCenter />} />
                            <Route path="/terms" element={<TermsPrivacy />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </AgeComplianceProvider>
                </UserProfileProvider>
            </AntdMobileProvider>
        </BrowserRouter>
    );
}

export default App;
