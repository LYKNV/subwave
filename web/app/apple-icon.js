import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#100e0c',
        }}
      >
        <div
          style={{
            width: 22,
            height: 110,
            background: '#f3efe6',
            transform: 'rotate(35deg)',
            borderRadius: 9,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
