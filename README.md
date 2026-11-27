<div align="center">

# 📄 Kaagaz
### Use Online on Web • Or Download 100% Offline Windows (`.exe`) & Android (`.apk`)

**Kaagaz** is a fast, privacy-first, open-source document productivity suite featuring **all 33 PDF tools**, a **Universal All-Document Reader**, and a **Zero-Waste A4 Print Studio**.  
Use it instantly **online in your browser**, or download the standalone **Windows** and **Android** apps to work **100% offline**—no sign-ups, no API keys, and zero file uploads.

[![License: MIT](https://shields.io)](LICENSE)
[![Offline Apps](https://shields.io)](../../releases)
[![Online Web](https://shields.io)](#-choose-how-you-want-to-use-kaagaz)

[⬇️ Download Offline `.exe` & `.apk`](../../releases) • [🌐 Use Online on Web](#-choose-how-you-want-to-use-kaagaz) • [✨ All 33 Tools](#-complete-33-in-1-pdf-toolkit)

</div>

---

## 🚀 Choose How You Want to Use Kaagaz

| Mode | Best For | Internet Required? | How to Start |
| :--- | :--- | :--- | :--- |
| **📴 Offline Windows App (`.exe`)** | PC & Laptop users who want maximum privacy and zero internet dependency | **No (100% Offline)** | Download `Kaagaz 1.0.0.exe` (Portable) or `Kaagaz Setup 1.0.0.exe` from [**Releases**](../../releases). |
| **📱 Offline Android App (`.apk`)** | Mobile users who want to merge, compress, sign, or read documents anywhere | **No (100% Offline)** | Download `Kaagaz-Offline.apk` from [**Releases**](../../releases) and install on Android. |
| **🌐 Online Web Version** | Instant browser access without installing anything on your device | **Yes (Browser)** | Open the hosted Web App link (or run locally via `npm run dev`). |

*(Note: Every single tool processes files 100% locally inside your device's memory—even when using the online web version, your files are never uploaded to any external server.)*

---

## ✨ Key Features

### 🛠️ 1. Complete 33-in-1 PDF Toolkit (100% Local Processing)

| Category | Included Tools |
| :--- | :--- |
| **Organize PDF (6)** | Merge PDF, Split PDF, Remove Pages, Extract Pages, Visual Organize PDF, Scan to PDF |
| **Optimize PDF (3)** | Compress PDF (Extreme / Recommended / Less), Repair PDF, Offline OCR (`tesseract.js`) |
| **Convert TO PDF (6)** | JPG/PNG to PDF, Word (`.docx`) to PDF, PowerPoint (`.pptx`) to PDF, Excel (`.xlsx/.csv`) to PDF, HTML to PDF, Markdown to PDF |
| **Convert FROM PDF (6)** | PDF to JPG (72/150/300 DPI), PDF to PNG, PDF to Word (`.docx`), PDF to PowerPoint (`.pptx`), PDF to Excel (`.xlsx/.csv`), PDF to PDF/A |
| **Edit PDF (5)** | Rotate PDF, Add Page Numbers, Add Watermark, Crop PDF, Interactive Edit & Annotate PDF |
| **PDF Security (4)** | Unlock PDF, Protect PDF (Password Encrypt), Electronic Sign PDF, Permanent Redact PDF |
| **Workflows & Utilities (3)** | Side-by-Side Compare PDF, Flatten & Grayscale PDF, Custom Multi-Step Automation Workflows |

---

### 📚 2. Universal All-Document Reader (100% Offline)
Open, search (`Ctrl + F`), and inspect almost any document format in clean multi-tab view without needing MS Office or third-party viewers:
- **Documents:** PDF (`.pdf` with page thumbnails & night-invert mode), Word (`.docx`, `.doc`, `.rtf`)
- **Spreadsheets & Slides:** Excel/CSV (`.xlsx`, `.xls`, `.csv` with multi-sheet tabs, sorting & search), PowerPoint (`.pptx`)
- **Code & Media:** Markdown (`.md`), HTML, JSON, Plain Text (`.txt`), and Images (`.jpg`, `.png`, `.webp`, `.svg`)

---

### 🖨️ 3. Smart Zero-Waste A4 Print Studio
Format notes, study sheets, and documents onto clean **A4 pages (`210mm × 297mm`)** before printing:
- **Live Paginated A4 Preview:** Real-time total page counter and direct inline text editing so you never accidentally print half-empty trailing pages.
- **Paper-Saving Layouts:** Switch between **Standard A4**, **Compact Exam Paper Mode**, and **2-Column Study Sheet Mode** to save up to **40% paper** when printing (`Ctrl + P`) or exporting to PDF.

---

## ⬇️ Offline Installation Guide

1. Open the [**Releases**](../../releases) section on the right sidebar.
2. **For Windows 10 / 11:**
   - Download **`Kaagaz 1.0.0.exe`** (Portable — double-click to run immediately without installing) or **`Kaagaz Setup 1.0.0.exe`** (Full Installer).
   - *(If Windows SmartScreen appears, click **More info → Run anyway**.)*
3. **For Android:**
   - Download **`Kaagaz-Offline.apk`**, tap to install, and allow *"Install from unknown sources"* if prompted.

---

## 🧑‍💻 Run Web Version Locally from Source

```bash
# 1. Clone the repository
git clone https://github.com
cd kaagaz-pdf-toolkit

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Start the Web App locally
npm run dev
```

---

## 🤝 Contributing & License

Contributions, bug reports, and feature suggestions are welcome! Feel free to open an **Issue** or submit a **Pull Request**.  
Open-source under the **MIT License** — see [`LICENSE`](LICENSE) for details.
