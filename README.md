# 🧬 Chromosome AR — Medical Event WebAR Demo

Image-tracking WebAR that overlays a video on a physical acrylic "X"
chromosome model. Built with MindAR + A-Frame. No app install, no
markers — just a QR code → camera → video overlay.

## 📁 Project structure

    chromosome-ar/
    ├── index.html                 ← the AR experience page
    ├── compile-target.html        ← helper to create targets.mind (run once)
    ├── README.md
    ├── css/style.css
    ├── js/
    │   ├── app.js
    │   └── video-handler.js
    └── assets/
        ├── targets/
        │   ├── chromosome-target.png   ← reference image (source)
        │   └── targets.mind            ← compiled tracking data (YOU generate)
        ├── videos/chromosome-info.mp4
        └── images/chromosome-preview.jpg

## ⚙️ One-time setup

MindAR needs a compiled `.mind` file. Generate it in the browser once:

1. Open `compile-target.html` (double-click it, or right-click → Open With → Chrome).
2. Drag `assets/targets/chromosome-target.png` onto the drop zone.
3. Click **Compile** (~30 s).
4. Click **Download targets.mind**.
5. Move the file to `assets/targets/targets.mind`.

## 🚀 Run locally

WebAR requires HTTPS or localhost. Do NOT double-click index.html.

    cd chromosome-ar
    python3 -m http.server 8000
    # or: npx http-server -p 8000

Open http://localhost:8000 on your laptop. To test on a phone, use ngrok:

    # terminal 1
    python3 -m http.server 8000
    # terminal 2
    npx ngrok http 8000

Open the https URL ngrok prints on your phone.

## 🌐 Deploy

- **Netlify Drop** (easiest): drag the folder onto https://app.netlify.com/drop
- **GitHub Pages**: push repo → Settings → Pages → main branch
- **Vercel**: `npm i -g vercel` then `vercel` inside the folder
- **Cloudflare Pages**: connect your GitHub repo

All four give you HTTPS automatically. Put the URL into a QR generator
and print for your event.

## 🔄 Replace the video

iOS requires H.264 baseline MP4. Re-encode with ffmpeg:

    ffmpeg -i input.mov \
      -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p \
      -movflags +faststart -crf 23 -c:a aac -b:a 128k \
      chromosome-info.mp4

Replace `assets/videos/chromosome-info.mp4`. Keep under 10 MB.

If your video aspect ratio isn't 4:3, update `<a-video width height>` in index.html:
- 16:9 → `width="1" height="0.5625"`
- 1:1  → `width="1" height="1"`

## 🔄 Replace the image target

Good targets: sharp, high-contrast, non-repeating, lots of detail.

1. Save your image as `assets/targets/chromosome-target.png`.
2. Open `compile-target.html`, drop it in, compile, download.
3. Replace `assets/targets/targets.mind`.
4. Reload the page. No code changes needed.

## 🩺 Troubleshooting

| Problem | Fix |
|---|---|
| Camera denied | iOS: Settings → Safari → Camera → Allow. Chrome: tap lock icon in URL bar. |
| Target never detected | Dim light, target too small, or low-feature image. Hold 30 cm away, good light, print ≥10 cm. |
| Video won't play on iPhone | Not H.264 baseline — re-encode with ffmpeg command above. |
| "Could not load targets.mind" | Run the one-time setup above. |
| Silent video | Mobile autoplay requires muted. Tap 🔇 to unmute. |
| Stuck on loading | Check browser console — MindAR logs the real error. |

## 📦 Zip for delivery

    zip -r chromosome-ar.zip chromosome-ar -x "*.DS_Store"

## 🧾 Credits

- MindAR — https://github.com/hiukim/mind-ar-js (MIT)
- A-Frame — https://aframe.io (MIT)

Both loaded from jsDelivr CDN. No npm install, no build step.