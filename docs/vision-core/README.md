# Aqurivo Vision Core — Dataset preparation

This is the first, read-only preparation step for the custom Aqurivo vision system.
It does not call Gemini, CLIP, YOLO, or any pretrained model. It does not modify
product records, download images, or upload data to a third party.

## 1. Audit the published catalog

Install the repository dependencies, ensure the local environment has the same
database configuration used by the site, then run:

```bash
npm run vision:audit
```

The command loads `.env.local` through Next's environment loader and reads
published products through Aqurivo's own database adapter. It therefore follows
the repository's configured Firestore or Turso backend.

The report includes:
- Number of published products, and how many have at least one image URL.
- Unique image references and distinct URL strings in the catalog.
- Missing-image products, malformed/non-HTTPS URLs, and duplicate URLs within
  the same product.
- Product counts grouped by category.

The audit checks URL syntax and HTTPS only. It does not claim that a remote
server currently responds or that the image is legally available for training.
Those checks are a separate step after reviewing the report.

## 2. Export a local manifest (optional)

To create a private local manifest for the next data-preparation step:

```bash
npm run vision:audit -- --export=/tmp/aqurivo-vision-manifest.json
```

The output file is created with owner-only permissions and the command refuses
to overwrite an existing file. It contains product IDs, bilingual titles,
category slugs, tags, and image URLs/metadata. Keep it local and do not commit it
to Git: product identifiers and supplier image URLs are catalog data.

## 3. Prerequisites

- Node.js version compatible with this repository.
- Repository dependencies installed (`npm install`).
- A valid local database configuration for the backend selected by
  `DATA_STORE` and `NEXT_PUBLIC_DATA_STORE`.
- For Turso, both settings must consistently select Turso and its connection
  environment variables must be configured. For Firestore, use the Firebase
  settings already required by the app.

## 4. Next milestone

Review the audit report first. Then add a separate image-availability and
dataset-quality pass (dimensions, format, duplicate content, broken links and
usage rights) before creating train/validation/test splits or training any
randomly initialized network.
