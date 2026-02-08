import { BrowserRouter, Route, Routes } from 'react-router-dom';
import BookForm from './pages/BookForm';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/add" element={<BookForm />} />
        <Route path="/edit/:id" element={<BookForm />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
