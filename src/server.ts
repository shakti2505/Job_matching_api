import 'dotenv/config';
import { app } from './app.js';
import { initializeDB } from './config/db.js';

const PORT = Number(process.env.PORT) || 3000;

async function startServer(): Promise<void> {
  try {
    console.log('Initializing database...');
    await initializeDB();
    console.log('Database initialized successfully.');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
