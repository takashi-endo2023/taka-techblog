import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({ params: { slug: post.id } }));
}

export async function GET({ params }: APIContext) {
  const posts = await getCollection('blog');
  const post = posts.find((p) => p.id === params.slug);
  if (!post) return new Response('Not found', { status: 404 });

  const { title, description, tags } = post.data;
  const truncatedDesc = description.length > 80 ? description.slice(0, 80) + '…' : description;
  const fontSize = title.length > 30 ? 48 : 58;

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
          justifyContent: 'space-between',
          padding: '60px 72px',
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
          // Tags row
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'row', gap: '10px' },
              children: tags.slice(0, 4).map((tag) => ({
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    background: 'rgba(124,106,247,0.2)',
                    border: '1px solid rgba(124,106,247,0.4)',
                    borderRadius: '6px',
                    padding: '4px 12px',
                    color: '#a78bfa',
                    fontSize: '22px',
                  },
                  children: tag,
                },
              })),
            },
          },
          // Body: title + description
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                flex: '1',
                justifyContent: 'center',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      color: '#f0f0f5',
                      fontSize: `${fontSize}px`,
                      fontWeight: 'bold',
                      lineHeight: '1.3',
                    },
                    children: title,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      color: '#8b8fa8',
                      fontSize: '26px',
                      lineHeight: '1.6',
                    },
                    children: truncatedDesc,
                  },
                },
              ],
            },
          },
          // Footer
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      color: '#7c6af7',
                      fontSize: '26px',
                      fontWeight: 'bold',
                    },
                    children: 'taka-techblog',
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', color: '#8b8fa8', fontSize: '22px' },
                    children: 'taka-techblog.com',
                  },
                },
              ],
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

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
