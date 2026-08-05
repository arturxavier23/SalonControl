import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Servicos from './pages/Servicos'
import Profissionais from './pages/Profissionais'
import Agenda from './pages/Agenda'
import Caixa from './pages/Caixa'
import Estoque from './pages/Estoque'
import Login from './pages/Login'
import Cadastro from './pages/Cadastro'
import Onboarding from './pages/Onboarding'
import AdminGeral from './pages/AdminGeral'
import EsqueciSenha from './pages/EsqueciSenha'
import AtualizarSenha from './pages/AtualizarSenha'
import Perfil from './pages/Perfil'
import ConfiguracoesSalao from './pages/ConfiguracoesSalao'
import PrivateRoute from './components/PrivateRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/admin" element={<AdminGeral />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/atualizar-senha" element={<AtualizarSenha />} />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/clientes"
          element={
            <PrivateRoute>
              <Clientes />
            </PrivateRoute>
          }
        />

        <Route
          path="/servicos"
          element={
            <PrivateRoute>
              <Servicos />
            </PrivateRoute>
          }
        />

        <Route
          path="/profissionais"
          element={
            <PrivateRoute>
              <Profissionais />
            </PrivateRoute>
          }
        />

        <Route
          path="/agenda"
          element={
            <PrivateRoute>
              <Agenda />
            </PrivateRoute>
          }
        />

        <Route
          path="/caixa"
          element={
            <PrivateRoute>
              <Caixa />
            </PrivateRoute>
          }
        />

        <Route
          path="/estoque"
          element={
            <PrivateRoute>
              <Estoque />
            </PrivateRoute>
          }
        />

        <Route
          path="/perfil"
          element={
            <PrivateRoute>
              <Perfil />
            </PrivateRoute>
          }
        />

        <Route
          path="/salao"
          element={
            <PrivateRoute>
              <ConfiguracoesSalao />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App