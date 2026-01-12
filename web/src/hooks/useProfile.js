import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setLoading(false);
        return;
      }

      // Aseguramos que el campo gym_id se obtenga correctamente
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("id, gym_id, role, first_name, last_name, phone, birth_date, gender, created_at, speciality, experience, bio, schedule, membership_type, status, email, assigned_coach_id")
        .eq("id", data.user.id)
        .single();

      if (error) {
        console.error('[useProfile.js] Error obteniendo perfil:', error.message);
      } else {
        // Log eliminado para producción
      }
      setProfile(profileData);
      setLoading(false);
    });
  }, []);

  return { profile, loading };
}
