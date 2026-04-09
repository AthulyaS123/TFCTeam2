// Server component — no 'use client'. Renders before hydration to prevent theme flash.
export default function ThemeScript() {
  const script = `try{var t=localStorage.getItem('tfc-theme');if(t==='light')document.documentElement.classList.add('light')}catch(e){}`
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
