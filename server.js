require('dotenv').config();
const app = require('./src/app');
const db = require('./src/config/database');

const PORT = process.env.PORT || 3000;

db.migrate.latest()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Console Logs Records API running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error al ejecutar migraciones:', err);
    process.exit(1);
  });
