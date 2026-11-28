# 📄 Kaagaz — All-in-One Offline PDF Toolkit & Document Reader

**Kaagaz** is a fast, secure, and **100% Offline-First PDF Toolkit**. It processes all your PDF tasks directly on your device without requiring an internet connection or uploading files to any external server—keeping your private documents completely safe.

---

## 📥 Download & Install

Head over to the **[Releases](../../releases)** page of this repository to download the latest build for your device:

| Platform | File Format | How to Download & Install |
| :--- | :--- | :--- |
| **Android** | `.apk` (`Kaagaz-Offline.apk`) | Download the latest `Kaagaz Android APK` from **[Releases](../../releases)** and install it on your phone. |
| **Windows** | `.exe` (Installer & Portable) | Download the latest `Kaagaz Windows EXE` from **[Releases](../../releases)** (use the Portable `.exe` to run without installation). |
| **macOS (Apple)** | `.dmg` (`Kaagaz.dmg`) | Download the latest `Kaagaz Mac DMG` from **[Releases](../../releases)**, open it, and drag **Kaagaz** into your **Applications** folder. |
| **Web Browser** | Local / Self-Hosted | Run directly in your browser using the local development steps below. |

> **💡 Note for macOS Users:** Since this is an unsigned community build, macOS may show a security warning the first time you open it. To bypass this, **Right-Click (or Control + Click)** the app in Applications and select **Open**.

---

## ✨ Key Features

* **🔒 100% Privacy & Offline:** Zero server uploads—all PDF processing happens locally on your PC, Mac, or phone.
* **📑 Organize & Edit:** Merge PDF, Split PDF, Remove Pages, Extract Pages, Rotate Pages, Crop PDF, and Add Page Numbers.
* **🔄 Convert PDF:** Convert PDFs to Word, Excel, PowerPoint (PPTX), HTML, and Markdown—or scan images directly to PDF.
* **🗜️ Optimize & Repair:** Compress large PDFs, convert to Grayscale, or repair corrupted PDF files.
* **🛡️ Security & Sign:** Password-protect or unlock PDFs, add watermarks, redact sensitive text, and add digital signatures.
* **🤖 Smart AI & OCR:** Extract text from scanned documents using Tesseract OCR and summarize or chat with your PDFs.

---

## 🛠️ Tech Stack

* **Frontend:** React, TypeScript, Vite
* **Desktop (Windows & macOS):** Electron & Electron Builder
* **Mobile (Android):** Capacitor
* **CI/CD Automation:** GitHub Actions (Automated cloud builds for `.apk`, `.exe`, and `.dmg`)

---

## 💻 Local Development

To run or modify the project on your local machine:

```bash
# 1. Clone the repository
git clone https://github.com
cd kaagaz-pdf-toolkit

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Start the local development server
npm run dev
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to open an **Issue** or submit a **Pull Request**.
