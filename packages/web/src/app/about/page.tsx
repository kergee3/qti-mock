'use client';

import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Link,
} from '@mui/material';
import {
  Info as InfoIcon,
  PlayArrow,
  Edit,
  IntegrationInstructions,
  VerticalAlignCenter,
  Translate,
  FontDownload,
} from '@mui/icons-material';
import AppFooter from '@/components/AppFooter';

export default function AboutPage() {
  return (
    <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <InfoIcon sx={{ fontSize: 32, mr: 1.5, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 0 }}>
              About
            </Typography>
          </Box>

          <Box sx={{ my: 3 }}>
            <Typography variant="h6" gutterBottom>
              概要
            </Typography>
            <Typography variant="body1" color="text.secondary">
              QTI Mock は QTI 3.0 (Question and Test Interoperability) アセスメントプラットフォームのデモ実装です。
              Next.js アプリケーションに QTI Player を iframe で埋め込み、
              QTI 準拠のアセスメントアイテムを表示・採点します。
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ my: 3 }}>
            <Typography variant="h6" gutterBottom>
              機能
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <PlayArrow color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Basic Run"
                  secondary={
                    <>
                      事前定義されたテストセットを順番に実行し、結果をサマリー表示。一部のサンプルは{' '}
                      <Link
                        href="https://github.com/amp-up-io/qti3-item-player-controller"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        qti3-item-player-controller
                      </Link>
                      {' '}から引用
                    </>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Edit color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Playground"
                  secondary="QTI XML を直接入力またはドラッグ＆ドロップで実行。URLパラメータ（?set=items-h&startswith=1）でBasic Runのサンプルを直接ロード可能"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <IntegrationInstructions color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="外部連携"
                  secondary="iframe + postMessage API / Callback API で外部アプリから利用可能"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <VerticalAlignCenter color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="縦書き対応"
                  secondary="日本語縦書きレイアウトをサポート"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Translate color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="ルビ対応"
                  secondary="漢字へのふりがな表示をサポート"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <FontDownload color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="フォント選択"
                  secondary="複数の日本語フォントから選択可能"
                />
              </ListItem>
            </List>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ my: 3 }}>
            <Typography variant="h6" gutterBottom>
              QTI Player
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              本デモの QTI Player は、<Link href="https://www.amp-up.io/" target="_blank" rel="noopener noreferrer">Amp-up.io社</Link> で開発され 1EdTech によって認定された Vue 3 ベースの QTI 3.0 レンダリングライブラリ{' '}
              <Link
                href="https://github.com/amp-up-io/qti3-item-player-vue3"
                target="_blank"
                rel="noopener noreferrer"
              >
                qti3-item-player-vue3
              </Link>
              {' '}を使用しています。
            </Typography>
            <Typography variant="body1" color="text.secondary">
              qti3-item-player-vue3 は、QTI 3.0 仕様に準拠したアセスメントアイテムのレンダリング、
              インタラクション処理、レスポンス処理、自動採点をサポートする包括的なコンポーネントライブラリです。
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ my: 3 }}>
            <Typography variant="h6" gutterBottom>
              サポートするインタラクション
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              以下のインタラクションは qti3-item-player-vue3 がサポートする全てのインタラクションタイプです。
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ my: 3 }}>
            <Typography variant="h6" gutterBottom>
              アーキテクチャ
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              npm workspaces を使用した Turborepo モノレポ構成です。
              Next.js (web) と Vue 3 (qti-player) の2つのパッケージで構成され、
              postMessage API を通じて通信します。
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="packages/web"
                  secondary="Next.js メインアプリケーション"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="packages/qti-player"
                  secondary="Vue 3 QTI Player (iframe埋め込み)"
                />
              </ListItem>
            </List>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ my: 3 }}>
            <Typography variant="h6" gutterBottom>
              外部連携
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              QTI Player は独立したサービスとして外部アプリケーションから利用可能です。
              iframe で埋め込み、postMessage API または Callback API を通じて連携できます。
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="postMessage API"
                  secondary="iframe経由でリアルタイムに採点結果を受信"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Callback API"
                  secondary="採点結果をサーバーに直接送信"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="フォント・認証トークン"
                  secondary="URLパラメータで設定可能"
                />
              </ListItem>
            </List>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ my: 3 }}>
            <Typography variant="h6" gutterBottom>
              技術スタック
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
              Web アプリ
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip label="Next.js 16" color="primary" />
              <Chip label="React 19" color="primary" />
              <Chip label="TypeScript" color="primary" />
              <Chip label="Material-UI v7" color="primary" />
              <Chip label="Turborepo" color="primary" />
            </Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
              QTI Player
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip label="Vue 3" color="secondary" />
              <Chip label="Vite" color="secondary" />
              <Chip
                label="qti3-item-player-vue3"
                color="secondary"
                component="a"
                href="https://github.com/amp-up-io/qti3-item-player-vue3"
                target="_blank"
                clickable
              />
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ my: 3 }}>
            <Typography variant="h6" gutterBottom>
              QTI 3.0 について
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
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
          </Box>

          <AppFooter />
        </CardContent>
      </Card>
  );
}
