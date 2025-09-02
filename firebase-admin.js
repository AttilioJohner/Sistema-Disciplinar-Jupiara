const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  } catch (err) {
    console.error('Erro ao inicializar Firebase Admin:', err.message);
  }
}

const db = admin.firestore();

module.exports = { admin, db };
