import { useState } from 'react'

const PLATFORMS = {
  Shopify: [
    ['Online Store → Themes', 'open your theme'],
    ['Click Edit code', 'find theme.liquid'],
    ['Paste the line just before', '</head>, then Save'],
  ],
  WordPress: [
    ['Appearance → Theme File Editor', 'or a headers plugin'],
    ['Open header.php', 'or the “Header Scripts” box'],
    ['Paste before </head>', 'and Update'],
  ],
  Wix: [
    ['Settings → Custom Code', ''],
    ['Add Custom Code', 'to Head, all pages'],
    ['Paste the line', 'and Apply'],
  ],
  'Plain HTML': [
    ['Open your index.html', ''],
    ['Paste the line before', '</head>'],
    ['Save and upload', 'that’s it'],
  ],
  'Tag Manager': [
    ['New Tag → Custom HTML', ''],
    ['Paste the line', 'trigger: All Pages'],
    ['Submit & Publish', 'the container'],
  ],
}

export default function PlatformInstructions() {
  const names = Object.keys(PLATFORMS)
  const [active, setActive] = useState(names[0])
  return (
    <div className="platforms">
      <div className="ptabs">
        {names.map((n) => (
          <button key={n} className={n === active ? 'on' : ''} onClick={() => setActive(n)}>{n}</button>
        ))}
      </div>
      <div className="pbody">
        <ol>
          {PLATFORMS[active].map(([a, b], i) => (
            <li key={i}><b>{a}</b>{b ? ' — ' + b : ''}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}
