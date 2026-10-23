import 'server-only';
import crypto from 'crypto';

export interface AmazonSearchItemResult {
  asin: string;
  title: string;
  image: string;
  price: number | null;
  currency: string;
  affiliateUrl: string;
  category?: string;
}

const REGION_HOST_MAP: Record<string, { host: string; marketplace: string }> = {
  'us-east-1': { host: 'webservices.amazon.com', marketplace: 'www.amazon.com' },
  'eu-west-1': { host: 'webservices.amazon.co.uk', marketplace: 'www.amazon.co.uk' },
  'us-west-2': { host: 'webservices.amazon.co.jp', marketplace: 'www.amazon.co.jp' },
};

const CATEGORY_SEARCH_INDEX_MAP: Record<string, string> = {
  all: 'All',
  electronics: 'Electronics',
  إلكترونيات: 'Electronics',
  fashion: 'Fashion',
  موضة: 'Fashion',
  health: 'HealthPersonalCare',
  صحة: 'HealthPersonalCare',
  home: 'HomeAndKitchen',
  منزل: 'HomeAndKitchen',
  sports: 'SportsAndOutdoors',
  رياضة: 'SportsAndOutdoors',
};

/**
 * Global in-memory rate limiter for Amazon PA-API 5.0:
 * Strictly enforces no more than 1 request per second (1000ms) across the server process.
 */
let lastAmazonRequestAtMs = 0;
let rateLimitChain: Promise<void> = Promise.resolve();

export async function enforceAmazonRateLimit(): Promise<void> {
  const nextTurn = rateLimitChain.then(async () => {
    const now = Date.now();
    const elapsed = now - lastAmazonRequestAtMs;
    if (elapsed < 1050) {
      await new Promise((resolve) => setTimeout(resolve, 1050 - elapsed));
    }
    lastAmazonRequestAtMs = Date.now();
  });
  rateLimitChain = nextTurn.catch(() => {});
  return nextTurn;
}

function hmacSha256(key: string | Buffer, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Buffer {
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, regionName);
  const kService = hmacSha256(kRegion, serviceName);
  return hmacSha256(kService, 'aws4_request');
}

export function isAmazonPaapiConfigured(): boolean {
  return Boolean(
    process.env.AMAZON_ACCESS_KEY?.trim() &&
      process.env.AMAZON_SECRET_KEY?.trim() &&
      process.env.AMAZON_ASSOCIATE_TAG?.trim()
  );
}

/**
 * Builds the canonical Amazon affiliate link with the Associate Tag.
 */
export function buildAmazonAffiliateUrl(asin: string): string {
  const cleanAsin = asin.trim().toUpperCase();
  const associateTag = (process.env.AMAZON_ASSOCIATE_TAG || '').trim();
  return `https://amazon.com/dp/${encodeURIComponent(cleanAsin)}?tag=${encodeURIComponent(
    associateTag
  )}`;
}

/**
 * Calls Amazon Product Advertising API 5.0 (SearchItems operation)
 * signed with AWS Signature Version 4.
 */
export async function searchAmazonPaapiItems(params: {
  keyword: string;
  category?: string;
}): Promise<AmazonSearchItemResult[]> {
  const accessKey = (process.env.AMAZON_ACCESS_KEY || '').trim();
  const secretKey = (process.env.AMAZON_SECRET_KEY || '').trim();
  const associateTag = (process.env.AMAZON_ASSOCIATE_TAG || '').trim();
  const region = (process.env.AMAZON_REGION || 'us-east-1').trim();

  if (!accessKey || !secretKey || !associateTag) {
    throw new Error(
      'AMAZON_CREDENTIALS_MISSING: يرجى إضافة AMAZON_ACCESS_KEY وAMAZON_SECRET_KEY وAMAZON_ASSOCIATE_TAG في متغيرات البيئة على الخادم.'
    );
  }

  const keyword = params.keyword.trim();
  if (!keyword) {
    return [];
  }

  // Enforce Amazon's 1 request per second rate limit
  await enforceAmazonRateLimit();

  const endpointInfo = REGION_HOST_MAP[region] || REGION_HOST_MAP['us-east-1'];
  const host = endpointInfo.host;
  const path = '/paapi5/searchitems';
  const service = 'ProductAdvertisingAPI';
  const target = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems';
  const contentType = 'application/json; charset=utf-8';
  const contentEncoding = 'amz-1.0';

  const rawCategory = (params.category || 'all').trim().toLowerCase();
  const searchIndex =
    CATEGORY_SEARCH_INDEX_MAP[rawCategory] ||
    CATEGORY_SEARCH_INDEX_MAP[params.category || ''] ||
    'All';

  const payloadObj = {
    Keywords: keyword,
    SearchIndex: searchIndex,
    ItemCount: 10,
    PartnerTag: associateTag,
    PartnerType: 'Associates',
    Marketplace: endpointInfo.marketplace,
    Resources: [
      'Images.Primary.Large',
      'Images.Primary.Medium',
      'ItemInfo.Title',
      'Offers.Listings.Price',
    ],
  };

  const payload = JSON.stringify(payloadObj);

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const canonicalHeaders =
    `content-encoding:${contentEncoding}\n` +
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${target}\n`;

  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';
  const payloadHash = sha256Hex(payload);

  const canonicalRequest = [
    'POST',
    path,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(stringToSign, 'utf8')
    .digest('hex');

  const authorizationHeader =
    `${algorithm} ` +
    `Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, ` +
    `Signature=${signature}`;

  const response = await fetch(`https://${host}${path}`, {
    method: 'POST',
    headers: {
      'content-encoding': contentEncoding,
      'content-type': contentType,
      host,
      'x-amz-date': amzDate,
      'x-amz-target': target,
      Authorization: authorizationHeader,
    },
    body: payload,
    cache: 'no-store',
  });

  const data = (await response.json().catch(() => ({}))) as {
    Errors?: Array<{ Code?: string; Message?: string }>;
    SearchResult?: {
      Items?: Array<{
        ASIN?: string;
        ItemInfo?: {
          Title?: { DisplayValue?: string };
        };
        Images?: {
          Primary?: {
            Large?: { URL?: string };
            Medium?: { URL?: string };
          };
        };
        Offers?: {
          Listings?: Array<{
            Price?: {
              Amount?: number;
              Currency?: string;
            };
          }>;
        };
      }>;
    };
  };

  if (!response.ok) {
    const errMsg =
      data?.Errors?.[0]?.Message ||
      `Amazon PA-API returned HTTP ${response.status}`;
    throw new Error(errMsg);
  }

  const rawItems = data?.SearchResult?.Items || [];

  return rawItems
    .filter((item) => Boolean(item.ASIN))
    .map((item) => {
      const asin = String(item.ASIN).trim();
      const title =
        item.ItemInfo?.Title?.DisplayValue?.trim() || `Amazon Product ${asin}`;
      const image =
        item.Images?.Primary?.Large?.URL ||
        item.Images?.Primary?.Medium?.URL ||
        '';
      const priceObj = item.Offers?.Listings?.[0]?.Price;
      const price =
        typeof priceObj?.Amount === 'number' && Number.isFinite(priceObj.Amount)
          ? priceObj.Amount
          : null;
      const currency = priceObj?.Currency || 'USD';

      return {
        asin,
        title,
        image,
        price,
        currency,
        affiliateUrl: buildAmazonAffiliateUrl(asin),
        category: params.category || 'عام',
      };
    });
}
