import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 192,
  height: 192,
};

export const contentType = 'image/png';
export const revalidate = 86400;

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          backgroundColor: '#0d1117',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="144"
          height="144"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.5 27.5L12.1 6.4C12.9 4.2 14.3 3.5 16 3.5C17.7 3.5 19.1 4.2 19.9 6.4L27.5 27.5H22.6L17.4 12.1C17.0 10.9 16.5 10.5 16 10.5C15.5 10.5 15.0 10.9 14.6 12.1L9.4 27.5H4.5Z"
            fill="#F9FAFB"
          />
          <path d="M16 3.5L17.6 7.5L16 9.2L14.4 7.5L16 3.5Z" fill="#2DD4BF" />
          <path d="M16 14.5L20.8 20.5L16 26.5L11.2 20.5L16 14.5Z" fill="#2DD4BF" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
