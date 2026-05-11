import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Employee } from '@/data/services';

interface AuthContextType {
  employee: Employee | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (login: string, password: string, remember?: boolean) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  employee: null,
  isAuthenticated: false,
  loading: true,
  login: async () => false,
  logout: () => {},
});

const STORAGE_KEY = 'majli_employee_id';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setEmployee(JSON.parse(stored) as Employee);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = async (loginVal: string, passwordVal: string, remember = false): Promise<boolean> => {
    try {
      const q = query(
        collection(db, 'employees'),
        where('login', '==', loginVal),
        where('password', '==', passwordVal)
      );
      const snap = await getDocs(q);
      if (snap.empty) return false;
      const doc = snap.docs[0];
      const emp = { ...doc.data(), id: doc.id } as Employee;
      setEmployee(emp);
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      const serialized = JSON.stringify(emp);
      if (remember) {
        localStorage.setItem(STORAGE_KEY, serialized);
      } else {
        sessionStorage.setItem(STORAGE_KEY, serialized);
      }
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setEmployee(null);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ employee, isAuthenticated: !!employee, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
