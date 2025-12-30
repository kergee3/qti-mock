'use client'

import { useRef, useState } from 'react'

interface QtiPlayerFrameProps {
  itemUrl: string
  sessionId: string
  onComplete?: () => void
}

export function QtiPlayerFrame({ itemUrl, sessionId, onComplete }: QtiPlayerFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Player URLを構築
  const playerBaseUrl = process.env.NEXT_PUBLIC_PLAYER_URL || 'http://localhost:5173'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const playerUrl = new URL(playerBaseUrl)
  playerUrl.searchParams.set('item', itemUrl)
  playerUrl.searchParams.set('callback', `${appUrl}/api/results`)
  playerUrl.searchParams.set('session', sessionId)

  return (
    <div className="player-frame" style={{ position: 'relative' }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          zIndex: 1
        }}>
          読み込み中...
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={playerUrl.toString()}
        onLoad={() => setIsLoading(false)}
        style={{
          width: '100%',
          height: '600px',
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}
      />
    </div>
  )
}
