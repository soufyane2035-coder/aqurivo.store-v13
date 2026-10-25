import assert from 'node:assert/strict';
import test from 'node:test';
import { getProductVideoSources } from '../lib/product-video';

const product = {
  title: { en: 'Travel Mug', ar: 'كوب سفر' },
  name: { en: 'Travel Mug', ar: 'كوب سفر' },
  images: [
    {
      url: 'https://images.example.test/mug.jpg',
      alt: { en: 'Mug', ar: 'كوب' },
      width: 800,
      height: 800,
    },
  ],
  videoUrl: 'https://media.example.test/video.mp4',
  videoUrls: [
    'https://media.example.test/video.mp4',
    'https://media.example.test/stream.m3u8',
    'http://media.example.test/insecure.mp4',
    'https://social.example.test/video',
  ],
  videos: [
    {
      url: 'https://media.example.test/video.mp4',
      title: { en: 'Mug demonstration', ar: 'عرض الكوب' },
      thumbnailUrl: 'https://images.example.test/video-poster.jpg',
    },
  ],
};

test('returns unique secure playable videos with localized metadata', () => {
  const sources = getProductVideoSources(product, 'ar');

  assert.equal(sources.length, 2);
  assert.equal(sources[0].url, 'https://media.example.test/video.mp4');
  assert.equal(sources[0].title, 'عرض الكوب');
  assert.equal(sources[0].thumbnailUrl, 'https://images.example.test/video-poster.jpg');
  assert.equal(sources[0].kind, 'file');
  assert.equal(sources[1].kind, 'file');
});

test('converts YouTube and Vimeo URLs to embeddable player URLs', () => {
  const sources = getProductVideoSources(
    {
      title: { en: 'Product', ar: 'منتج' },
      images: [],
      videoUrl: 'https://youtu.be/abc123XYZ_0',
      videoUrls: ['https://vimeo.com/123456789'],
    },
    'en'
  );

  assert.equal(
    sources[0].embedUrl,
    'https://www.youtube-nocookie.com/embed/abc123XYZ_0'
  );
  assert.equal(sources[1].embedUrl, 'https://player.vimeo.com/video/123456789');
});
