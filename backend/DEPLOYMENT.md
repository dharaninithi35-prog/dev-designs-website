# Backend Deployment Instructions - Dev Designs

To deploy the backend for your website, follow these steps:

### 1. Set Up Environment Variables
Create a `.env` file in the `backend/` directory (I have already created one with placeholders for you). Fill in your actual credentials:
- `PORT`: The port your server will run on (default 5000).
- `MONGODB_URI`: Your MongoDB connection string (local or cloud like MongoDB Atlas).
- `JWT_SECRET`: A secure, random string for token generation.
- `EMAIL_USER` & `EMAIL_PASS`: Your Gmail credentials (use an App Password for Gmail).

### 2. Install Dependencies
Navigate to the `backend` folder and run:
```bash
npm install
```

### 3. Start the Server
For development:
```bash
node server.js
```
For production (using PM2 or similar):
```bash
npx pm2 start server.js --name "dev-designs-backend"
```

### 4. Hosting Options
- **Render / Heroku / Railway**: Great for easy Node.js hosting. Connect your GitHub repo and set the build command to `npm install` and start command to `node server.js`.
- **VPS (DigitalOcean / AWS)**: Install Node.js and MongoDB, then use PM2 to keep the process running.

### 5. Frontend Update
Ensure the `API_BASE` in `public/script.js` points to your deployed backend URL instead of `localhost:5000`.
