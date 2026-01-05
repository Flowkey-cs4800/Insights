import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../services/authService';
import { getCurrentUser } from '../services/authService';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const result = await getCurrentUser();
    if (result.success) {
      setUser(result.data);
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    let ignore = false;

    async function fetchUser() {
      const result = await getCurrentUser();
      if (!ignore) {
        if (result.success) {
          setUser(result.data);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    }

    fetchUser();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}