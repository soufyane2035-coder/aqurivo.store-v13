import 'server-only';
import { createHash } from 'crypto';
import { getServiceReadiness, loadServerEnv } from '@/server/config/env';
import { validateUploadMetadata } from '@/server/validators';

export interface SignedCloudinaryUpload {
  configured: true;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

export interface UnconfiguredCloudinaryUpload {
  configured: false;
  reason: string;
}

/**
 * Generates a server-signed Cloudinary upload payload after validating file type and size.
 * The Cloudinary API Secret never leaves the server.
 * If Cloudinary credentials are not set in `.env.local`, returns an honest `configured: false` state.
 */
export function createCloudinarySignedUpload(
  payload: unknown
): SignedCloudinaryUpload | UnconfiguredCloudinaryUpload {
  const readiness = getServiceReadiness();
  if (!readiness.cloudinaryConfigured) {
    return {
      configured: false,
      reason:
        'Cloudinary environment variables (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not configured in .env.local yet.',
    };
  }

  const validated = validateUploadMetadata(payload);
  const env = loadServerEnv();
  const timestamp = Math.floor(Date.now() / 1000);

  // Cloudinary signature parameters must be sorted alphabetically
  const stringToSign = `folder=${validated.folder}&timestamp=${timestamp}${env.cloudinaryApiSecret}`;
  const signature = createHash('sha1').update(stringToSign).digest('hex');

  return {
    configured: true,
    cloudName: env.cloudinaryCloudName,
    apiKey: env.cloudinaryApiKey,
    timestamp,
    folder: validated.folder,
    signature,
  };
}
