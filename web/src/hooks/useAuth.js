import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useAuth() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = no user, object = user
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error obteniendo sesión:", error.message);
          setUser(null);
        } else {
          console.log("Sesión inicial:", session?.user?.email || "No hay usuario");
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error("Error en getInitialSession:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email || "Sin usuario");
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { 
    user, 
    loading,
    logout: async () => {
      try {
        setLoading(true);
        console.log('Iniciando logout...');
        
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('Error al cerrar sesión:', error);
          throw error;
        }
        
        // Limpiar el estado
        setUser(null);
        console.log('Logout exitoso');
        
        // Redireccionar al login
        window.location.href = '/';
        
      } catch (error) {
        console.error('Error durante logout:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    isAuthenticated: !!user
  };
}
