import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { Layout } from './components/Layout';
import { Feed } from './pages/Feed';
import { Explore } from './pages/Explore';
import { Notifications } from './pages/Notifications';
import { Profile } from './pages/Profile';
import { Compose } from './pages/Compose';
import { Login } from './pages/Login';
import { PostDetail } from './pages/PostDetail';
import { Tamagotchi } from './pages/Tamagotchi';
import { Meow } from './pages/Meow';
import { Install } from './pages/Install';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Feed />} />
            <Route path="explorar" element={<Explore />} />
            <Route path="notifs" element={<Notifications />} />
            <Route path="tamagotchi" element={<Tamagotchi />} />
            <Route path="meow" element={<Meow />} />
            <Route path="instalar" element={<Install />} />
            <Route path="perfil" element={<Profile />} />
            <Route path="perfil/:id" element={<Profile />} />
            <Route path="compose" element={<Compose />} />
            <Route path="login" element={<Login />} />
            <Route path="post/:id" element={<PostDetail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
