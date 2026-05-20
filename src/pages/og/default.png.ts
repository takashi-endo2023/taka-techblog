import type { APIContext } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';

export async function GET(_ctx: APIContext) {
  const fontPath = path.resolve('./public/fonts/NotoSansJP-Bold.ttf');
  const fontData = fs.readFileSync(fontPath);

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '630px',
          background: '#0f1117',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: 'NotoSansJP',
          position: 'relative',
        },
        children: [
          // Top accent bar
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: '0px',
                left: '0px',
                width: '1200px',
                height: '4px',
                background: 'linear-gradient(90deg, #7c6af7, #a78bfa, #60a5fa)',
                display: 'flex',
              },
              children: [],
            },
          },
          // Logo mark
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                fontSize: '72px',
                fontWeight: 'bold',
                color: '#7c6af7',
                marginBottom: '24px',
              },
              children: '</>'
            },
          },
          // Site name
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                fontSize: '56px',
                fontWeight: 'bold',
                color: '#f0f0f5',
                marginBottom: '20px',
              },
              children: 'taka-techblog',
            },
          },
          // Tagline
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                fontSize: '28px',
                color: '#8b8fa8',
              },
              children: 'フルスタック × AI × チームビルディング',
            },
          },
          // URL
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: '48px',
                right: '72px',
                display: 'flex',
                fontSize: '22px',
                color: '#8b8fa8',
              },
              children: 'taka-techblog.com',
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'NotoSansJP', data: fontData, weight: 700, style: 'normal' }],
    }
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
