// Script temporal para crear el usuario superadmin
import { createSuperAdmin } from "../api/memberAccess.api";

async function run() {
  const result = await createSuperAdmin({
    email: "camilo.ribon@cecar.edu.co",
    password: "Cami1320",
    first_name: "Camilo",
    last_name: "Ribon",
    phone: null,
    status: "Activo"
  });
  if (result.success) {
    // eslint-disable-next-line no-console
    console.log("✅ Superadmin creado con éxito. ID:", result.userId);
  } else {
    // eslint-disable-next-line no-console
    console.error("❌ Error creando superadmin:", result.error);
  }
}

run();
