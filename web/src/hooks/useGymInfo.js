import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export function useGymInfo(gymId) {
  const [gym, setGym] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gymId) {
      setLoading(false);
      return;
    }
    supabase
      .from("gyms")
      .select("id, name, address, phone")
      .eq("id", gymId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setGym(null);
        } else {
          setGym(data);
        }
        setLoading(false);
      });
  }, [gymId]);

  return { gym, loading };
}
