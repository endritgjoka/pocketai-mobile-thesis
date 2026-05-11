# PocketAI Model Hosting

## Why Models Are Not Bundled
GGUF files are approximately 2 GB each. Bundling them would make Git, APK, and IPA artifacts impractical and would slow iteration.

## How To Host GGUF Files
Place `.gguf` files on a server that supports large-file downloads and stable HTTPS URLs. Static hosting, object storage, or a private file server are acceptable.

## Expected File Naming
- `phi3-mini-q4.gguf`
- `llama-3.2-3b-q4.gguf`

## Updating `src/config/models.ts`
Replace each placeholder URL with the hosted file URL. Keep filenames stable unless you also migrate existing downloaded model metadata.

## Download Flow
The app downloads a selected model on first use, reports progress, writes the file into the app document directory, stores model metadata in SQLite, and marks the model as active.

## Storage Location
Models are stored under:

`FileSystem.documentDirectory + "models/"`

Documents are stored under:

`FileSystem.documentDirectory + "documents/"`

## Large File Warnings
Keep the app open during download. Test on Wi-Fi first. Ensure enough device storage is available before formal experiments.

## Recommended Manual Testing Steps
1. Replace placeholder URLs.
2. Run a dev build.
3. Download the Light Mode model.
4. Restart the app.
5. Confirm the model remains downloaded.
6. Send a short chat prompt.
7. Repeat with the Full Mode model.
