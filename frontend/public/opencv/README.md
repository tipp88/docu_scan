# OpenCV.js Setup

This directory should contain the OpenCV.js WebAssembly file.

## Download OpenCV.js

1. Visit the official OpenCV.js builds page:
   https://docs.opencv.org/4.8.0/opencv.js

2. Download `opencv.js` (version 4.8.0 or later)

3. Place the downloaded `opencv.js` file in this directory:
   `/frontend/public/opencv/opencv.js`

## Alternative: Direct Download

You can download directly from the OpenCV GitHub releases:

```bash
cd frontend/public/opencv/
curl -L https://docs.opencv.org/4.8.0/opencv.js -o opencv.js
```

## File Size

The opencv.js file is approximately 8-9 MB. This is normal for the WebAssembly build.

## Verification

After placing the file, verify it exists:

```bash
ls -lh frontend/public/opencv/opencv.js
```

You should see a file around 8-9 MB in size.
