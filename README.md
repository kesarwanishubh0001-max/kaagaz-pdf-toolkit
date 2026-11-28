# 📄 Kaagaz — All-in-One Offline 33-in-1 PDF Toolkit & Document Reader

**Kaagaz** is a free, fast, and **100% privacy-first 33-in-1 PDF Toolkit**, universal all-document reader, and smart A4 print studio. It processes all your files directly on your device without requiring an internet connection, accounts, API keys, or server uploads—keeping your sensitive documents completely private.

---

## 📥 Download & Install

Visit the **[Releases](../../releases)** page of this repository to download the latest offline build for your operating system:

| Platform | File Format | How to Download & Install |
| :--- | :--- | :--- |
| **Android** | `.apk` (`Kaagaz-Offline.apk`) | Download the latest `Kaagaz Android APK` from **[Releases](../../releases)** and install it on your device. |
| **Windows** | `.exe` (Installer & Portable) | Download the latest `Kaagaz Windows EXE` from **[Releases](../../releases)** (use the Portable `.exe` to run without installation). |
| **macOS (Apple)** | `.dmg` (`Kaagaz.dmg`) | Download the latest `Kaagaz Mac DMG` from **[Releases](../../releases)**, open it, and drag **Kaagaz** into your **Applications** folder. |
| **Linux** | `.AppImage` & `.deb` | Download `.AppImage` (portable, run with `chmod +x` and double-click) or install `.deb` on Ubuntu/Debian via `sudo dpkg -i *.deb` from **[Releases](../../releases)**. |
| **Web Browser** | Online / Local | Run directly in your browser using the local development steps below. |

> **💡 Note for macOS Users:** Since this is an unsigned community build, macOS may show a security warning on first launch. To open it, **Right-Click (or Control + Click)** the app in Applications and select **Open**.

---

## ✨ Key Features

* **🔒 100% Privacy & Offline:** Zero file uploads—all PDF and document processing runs locally on your PC, Mac, Linux machine, or phone.
* **📑 Organize & Edit:** Merge PDF, Split PDF, Remove Pages, Extract Pages, Rotate Pages, Crop PDF, and Add Page Numbers.
* **🔄 Universal Document Reader & Converter:** Convert PDFs to Word, Excel, PowerPoint (PPTX), HTML, and Markdown—or scan images directly to PDF.
* **🖨️ Smart A4 Print Studio:** Arrange, scale, and format multi-page documents cleanly for A4 printing.
* **🗜️ Optimize & Repair:** Compress large PDFs, convert to Grayscale, or repair corrupted PDF files.
* **🛡️ Security & Sign:** Password-protect or unlock PDFs, add watermarks, redact sensitive text, and add digital signatures.
* **🤖 Smart AI & OCR:** Extract text from scanned documents using Tesseract OCR and summarize or chat with your PDFs locally.

---

## 🛠️ Tech Stack

* **Frontend:** React, TypeScript, Vite
* **Desktop (Windows, macOS & Linux):** Electron & Electron Builder
* **Mobile (Android):** Capacitor
* **CI/CD Automation:** GitHub Actions (Automated cloud builds for `.apk`, `.exe`, `.dmg`, `.AppImage`, and `.deb`)

---

## 💻 Local Development

To run or customize the project on your local machine:

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
