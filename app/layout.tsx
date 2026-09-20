import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'StudyGen — flashcards and quizzes from your notes',
  description:
    'Turn pasted notes or a PDF into flashcards or a multiple-choice quiz. No account required.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

/**
 * Runs before first paint so a dark-mode visitor never sees a white flash.
 * Follows the system setting until the person picks a theme, then remembers it.
 */
const themeScript = `(function(){try{
var root=document.documentElement;
var media=window.matchMedia('(prefers-color-scheme: dark)');
var stored=localStorage.getItem('theme');
root.classList.toggle('dark',stored?stored==='dark':media.matches);
media.addEventListener('change',function(e){
if(!localStorage.getItem('theme'))root.classList.toggle('dark',e.matches);
});
}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
