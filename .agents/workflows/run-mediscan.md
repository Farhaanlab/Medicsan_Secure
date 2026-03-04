---
description: How to start and run the MediScan Website, Backend API, OCR Server, and Android App
---
# Running MediScan (Full Stack & Mobile)

To get the full MediScan application running locally—including the website, the Node.js backend, the Python OCR service, and the Android mobile app—you need to launch four separate services. 

Here is everything you need to do, step-by-step.

## 1. Finding your Local IP Address (For Android Only)
If you plan to run the Android app on your physical phone, your phone needs to know how to talk to your computer's backend over your local WiFi.

1. Open a terminal and run:
   ```powershell
   ipconfig
   ```
2. Look for the **IPv4 Address** under your active Wi-Fi or Ethernet adapter (e.g., `192.168.1.6`).
3. Open `elysian-health-ui-main/src/lib/api.ts`.
4. Update the `NATIVE_API_URL` variable to point to your IP address on port 3001:
   ```typescript
   const NATIVE_API_URL = 'http://YOUR_IPv4_ADDRESS:3001/api';
   // Example: const NATIVE_API_URL = 'http://192.168.1.6:3001/api';
   ```

---

## 2. Start the Python OCR Server (Prescription Scanning)
This server processes the images loaded from the frontend.

1. Open a new terminal.
2. Navigate to the OCR server folder:
   ```powershell
   // turbo
   cd c:\Users\faarh\Desktop\Antigravity_mediscan_prompt1\update_for_ocr
   ```
3. Start the FastAPI server on port 8085:
   ```powershell
   // turbo
   uvicorn main:app --host 0.0.0.0 --port 8085
   ```
   *(Keep this terminal running)*

---

## 3. Start the Node.js Backend API
This server handles authentication, database connections, and the main APIs.

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
   *(Keep this terminal running)*

---

## 4. Start the Frontend Website
This runs the React/Vite website accessible from your computer browser.

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
   *(Keep this terminal running)*

---

## 5. Start the Next.js Secondary Website
This runs the Next.js application frontend.

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
   *(Keep this terminal running)*

---

## 6. Build and Run the Android App
After ensuring your Native API URL is correctly set to your computer's IP address (Step 1), you compile the web app to native format and launch it using Android Studio.

1. Open a fifth terminal window.
2. Navigate to the frontend folder:
   ```powershell
   // turbo
   cd c:\Users\faarh\Desktop\Antigravity_mediscan_prompt1\elysian-health-ui-main
   ```
3. Build the modern web assets:
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
   *(If this command fails with an IDE Error, run the Absolute Path manually like: `$env:CAPACITOR_ANDROID_STUDIO_PATH="C:\Program Files\Android\Android Studio1\bin\studio64.exe"; npx cap open android`)*
   ```powershell
   // turbo
   npx cap open android
   ```
6. **In Android Studio:** Wait for the "Gradle Sync" to finish and index perfectly at the bottom status bar. Then simply click the green **Play (Run)** button at the top toolbar to install the newly compiled app right onto your physical device!
