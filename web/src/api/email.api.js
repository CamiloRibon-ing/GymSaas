import nodemailer from "nodemailer";

const smtpConfig = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "santiago.fontalvo@cecar.edu.co",
    pass: "bbgj luoy yrxi pwep"
  }
};

const fromEmail = "noreply@joyeriaklatee.com";
const fromName = "GymMVP";

export async function sendApprovalEmail(to, gymName) {
  const transporter = nodemailer.createTransport(smtpConfig);
  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject: "¡Tu gimnasio ha sido aprobado!",
    html: `<h2>¡Felicitaciones!</h2>
           <p>Tu gimnasio <b>${gymName}</b> ha sido aprobado por el superadmin.</p>
           <p>Ya puedes acceder al sistema como administrador.</p>`
  });
}

export async function sendRejectionEmail(to, gymName) {
  const transporter = nodemailer.createTransport(smtpConfig);
  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject: "Solicitud rechazada",
    html: `<h2>Lo sentimos</h2>
           <p>Tu solicitud para el gimnasio <b>${gymName}</b> fue rechazada por el superadmin.</p>
           <p>Si tienes dudas, contáctanos.</p>`
  });
}
