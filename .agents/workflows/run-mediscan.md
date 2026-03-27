---
description: How to start and run the MediScan Website, Backend API, OCR Server, and Android App
---

# Running MediScan (Full Stack & Mobile)

To get the full MediScan application running locally—including the website, the Node.js backend, the Python OCR service, and the Android mobile app—you need to launch four separate services. 

Here is everything you need to do, step-by-step.

## 1. Local Network API (For Physical Android Devices)
Your Android app now automatically connects to your live Render backend (`https://medicsan-secure.onrender.com/api`) when built for production!
If you explicitly want to test it locally against your computer instead:
1. Find your IPv4 address (`ipconfig` in terminal).
2. Create a `.env` file in `elysian-health-ui-main` and add: 
   `VITE_API_URL=http://YOUR_IPV4:3001/api`

---

## 2. Start the Python OCR Server (Prescription Scanning)
This server processes images locally. (In production, the node backend falls back to Gemini AI if this isn't available).

1. Open a new terminal.
2. Navigate to the OCR server folder:
   ```powershell
   // turbo
   cd c:\Users\faarh\Desktop\Antigravity_mediscan_prompt1\update_for_ocr_2
   ```
3. Start the FastAPI server on port 8085:
   ```powershell
   // turbo
   uvicorn main:app --host 0.0.0.0 --port 8085
   ```

---

## 3. Start the Node.js Backend API
This server connects directly to your live Supabase PostgreSQL database!

1. Open a second terminal window.
2. Navigate to the API folder:
   ```powershell
   // turbo
   cd c:\Users\faarh\Desktop\Antigravity_mediscan_prompt1\apps\api
   ```
3. Start the Node development server:
   ```powershell
   // turbo
   npm run dev
   ```

---

## 4. Start the Frontend Website
Runs the React/Vite patient portal locally.

1. Open a third terminal window.
2. Navigate to the frontend folder:
   ```powershell
   // turbo
   cd c:\Users\faarh\Desktop\Antigravity_mediscan_prompt1\elysian-health-ui-main
   ```
3. Start the Vite development server:
   ```powershell
   // turbo
   npm run dev
   ```
4. Now, open your web browser and go to: **http://localhost:8080**

---

## 5. Start the Next.js Secondary Website
Runs the Next.js auxiliary app.

1. Open a fourth terminal window.
2. Navigate to the web folder:
   ```powershell
   // turbo
   cd c:\Users\faarh\Desktop\Antigravity_mediscan_prompt1\apps\web
   ```
3. Start the Next.js development server:
   ```powershell
   // turbo
   npm run dev -- -p 8081
   ```
4. Now, open your web browser and go to: **http://localhost:8081**

---

## 6. Build and Run the Android App
Compile the web app to native format and launch it using Android Studio.

1. Open a fifth terminal.
2. Navigate to the frontend folder:
   ```powershell
   // turbo
   cd c:\Users\faarh\Desktop\Antigravity_mediscan_prompt1\elysian-health-ui-main
   ```
3. Build the modern web assets (This will automatically hook it to the Render backend!):
   ```powershell
   // turbo
   npm run build
   ```
4. Sync the built web assets securely into the native Android platform:
   ```powershell
   // turbo
   npx cap sync android
   ```
5. Open up Android Studio with this targeted project:
   ```powershell
   // turbo
   $env:CAPACITOR_ANDROID_STUDIO_PATH="C:\Program Files\Android\Android Studio1\bin\studio64.exe"; npx cap open android
   ```
