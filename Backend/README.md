# Lead Management System - Backend

Backend API for the Lead Management System built with Node.js, Express, and MongoDB.

## Deployment on Render

### Prerequisites
- MongoDB Atlas account with connection string
- Email credentials (Gmail with App Password)
- Frontend URL (if deploying frontend separately)

### Steps to Deploy

1. **Push your code to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **Create a new Web Service on Render**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository
   - Select the `Backend` directory as the root directory

3. **Configure the Web Service**
   - **Name**: `lead-management-backend` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `Backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or your preferred plan)

4. **Set Environment Variables**
   Add the following environment variables in Render:
   
   ```
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://huleyash3610_db_user:Bz9RPYQKPXW29l1P@imtest.suiaxhl.mongodb.net/?appName=ImTest
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   JWT_EXPIRE=7d
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=huleyash3610@gmail.com
   EMAIL_PASSWORD=iyzjprqcpcgyzzry
   FRONTEND_URL=https://your-frontend-domain.com
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy your application
   - Once deployed, you'll get a URL like: `https://your-app-name.onrender.com`

6. **Update CORS Settings**
   - After deploying your frontend, update the `FRONTEND_URL` environment variable
   - Also update the frontend URL in `server.js` CORS configuration if needed

### Important Notes

- **Free Tier Limitation**: Free tier services on Render spin down after 15 minutes of inactivity. First request after inactivity may take 30-60 seconds.
- **Root Directory**: Make sure to set `Backend` as the root directory in Render settings
- **Environment Variables**: Never commit `.env` file. Always use Render's environment variables
- **MongoDB**: Ensure your MongoDB Atlas allows connections from anywhere (0.0.0.0/0) or whitelist Render's IP addresses
- **SSL**: Render provides free SSL certificates automatically

### Testing Deployment

Once deployed, test your API:
```bash
curl https://your-app-name.onrender.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

### Updating Your Deployment

Render automatically redeploys when you push to your connected branch:
```bash
git add .
git commit -m "Update application"
git push origin main
```

### Monitoring

- View logs in Render Dashboard under your service
- Check deployment status and health metrics
- Set up alerts for service failures

### Troubleshooting

1. **MongoDB Connection Issues**
   - Verify MongoDB Atlas IP whitelist
   - Check connection string format
   - Ensure credentials are correct

2. **CORS Errors**
   - Add your frontend domain to CORS origins
   - Update FRONTEND_URL environment variable

3. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json
   - Review build logs in Render dashboard

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run in development mode
npm run dev

# Run in production mode
npm start
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/users` - Get all users
- `GET /api/leads` - Get all leads
- `POST /api/leads` - Create new lead
- `GET /api/analytics` - Get analytics data
- `GET /api/dashboard` - Get dashboard data

## Tech Stack

- Node.js & Express
- MongoDB Atlas
- JWT Authentication
- Nodemailer for emails
- Multer for file uploads
- XLSX for Excel handling
