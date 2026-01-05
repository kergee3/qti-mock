'use client';

import { Box, Typography, Card, CardContent, Link, Chip, Stack } from '@mui/material';

export default function AboutPage() {
  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', px: 3, pt: 2, pb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        About
      </Typography>

      <Card sx={{ mt: 2, border: '1px solid #ccc' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            QTI Mock - Assessment Platform Demo
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
            QTI Mock は QTI 3.0 (Question and Test Interoperability) アセスメントプラットフォームのデモ実装です。
            Next.js アプリケーションに QTI Player を iframe で埋め込み、
            QTI 準拠のアセスメントアイテムを表示・採点します。
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mt: 2, border: '1px solid #ccc' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            機能
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            <Box component="ul" sx={{ pl: 2, mb: 0, '& li': { mb: 1 }, '& li:last-child': { mb: 0 } }}>
              <li>
                <strong>Basic Run</strong> - 事前定義されたテストセットを順番に実行し、結果をサマリー表示
                <br />
                <Typography variant="caption" color="text.secondary" component="span">
                  ※ 一部のサンプルは{' '}
                  <Link
                    href="https://github.com/amp-up-io/qti3-item-player-controller"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    qti3-item-player-controller
                  </Link>
                  {' '}から引用しています
                </Typography>
              </li>
              <li><strong>Playground</strong> - QTI XML を直接入力またはドラッグ＆ドロップで実行</li>
              <li><strong>縦書き対応</strong> - 日本語縦書きレイアウトをサポート</li>
              <li><strong>ルビ対応</strong> - 漢字へのふりがな表示をサポート</li>
              <li><strong>フォント選択</strong> - 複数の日本語フォントから選択可能</li>
            </Box>
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mt: 2, border: '1px solid #ccc' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            QTI Player
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            本デモの QTI Player は、1EdTech によって認定された Vue 3 ベースの QTI 3.0 レンダリングライブラリ{' '}
            <Link
              href="https://github.com/amp-up-io/qti3-item-player-vue3"
              target="_blank"
              rel="noopener noreferrer"
            >
              qti3-item-player-vue3
            </Link>
            {' '}を使用しています。
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
            qti3-item-player-vue3 は、QTI 3.0 仕様に準拠したアセスメントアイテムのレンダリング、
            インタラクション処理、レスポンス処理、自動採点をサポートする包括的なコンポーネントライブラリです。
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mt: 2, border: '1px solid #ccc' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            サポートするインタラクション
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            以下のインタラクションは qti3-item-player-vue3 がサポートする全てのインタラクションタイプです。
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            <Chip label="choiceInteraction" size="small" variant="outlined" />
            <Chip label="inlineChoiceInteraction" size="small" variant="outlined" />
            <Chip label="matchInteraction" size="small" variant="outlined" />
            <Chip label="gapMatchInteraction" size="small" variant="outlined" />
            <Chip label="orderInteraction" size="small" variant="outlined" />
            <Chip label="textEntryInteraction" size="small" variant="outlined" />
            <Chip label="extendedTextInteraction" size="small" variant="outlined" />
            <Chip label="hottextInteraction" size="small" variant="outlined" />
            <Chip label="hotspotInteraction" size="small" variant="outlined" />
            <Chip label="selectPointInteraction" size="small" variant="outlined" />
            <Chip label="graphicOrderInteraction" size="small" variant="outlined" />
            <Chip label="graphicAssociateInteraction" size="small" variant="outlined" />
            <Chip label="graphicGapMatchInteraction" size="small" variant="outlined" />
            <Chip label="positionObjectInteraction" size="small" variant="outlined" />
            <Chip label="sliderInteraction" size="small" variant="outlined" />
            <Chip label="mediaInteraction" size="small" variant="outlined" />
            <Chip label="drawingInteraction" size="small" variant="outlined" />
            <Chip label="uploadInteraction" size="small" variant="outlined" />
            <Chip label="endAttemptInteraction" size="small" variant="outlined" />
            <Chip label="customInteraction" size="small" variant="outlined" />
            <Chip label="portableCustomInteraction" size="small" variant="outlined" />
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mt: 2, border: '1px solid #ccc' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            技術スタック
          </Typography>
          <Typography variant="body2" color="text.secondary" component="ul" sx={{ pl: 2, mb: 0, '& li': { mb: 0.5 }, '& li:last-child': { mb: 0 } }}>
            <li>Next.js 15 (App Router)</li>
            <li>Vue 3 + Vite (QTI Player)</li>
            <li>
              <Link
                href="https://github.com/amp-up-io/qti3-item-player-vue3"
                target="_blank"
                rel="noopener noreferrer"
              >
                qti3-item-player-vue3
              </Link>
              {' '}(1EdTech 認定 QTI 3.0 Player)
            </li>
            <li>Material-UI v7</li>
            <li>TypeScript</li>
            <li>Turborepo (Monorepo)</li>
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mt: 2, border: '1px solid #ccc' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            アーキテクチャ
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            npm workspaces を使用した Turborepo モノレポ構成です。
            Next.js (web) と Vue 3 (qti-player) の2つのパッケージで構成され、
            postMessage API を通じて通信します。
          </Typography>
          <Typography variant="body2" color="text.secondary" component="ul" sx={{ pl: 2, mb: 0, '& li': { mb: 0.5 }, '& li:last-child': { mb: 0 } }}>
            <li><strong>packages/web</strong> - Next.js メインアプリケーション</li>
            <li><strong>packages/qti-player</strong> - Vue 3 QTI Player (iframe埋め込み)</li>
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mt: 2, border: '1px solid #ccc' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            QTI 3.0 について
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            QTI (Question and Test Interoperability) は、1EdTech (旧 IMS Global Learning Consortium) が策定した
            アセスメントコンテンツの相互運用性を実現するための国際標準規格です。
          </Typography>
          <Link
            href="https://www.imsglobal.org/question/index.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            1EdTech - QTI Specification
          </Link>
        </CardContent>
      </Card>
    </Box>
  );
}
