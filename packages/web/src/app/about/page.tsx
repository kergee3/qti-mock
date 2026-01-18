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
  AutoAwesome,
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

          <Box sx={{ my: 2 }}>
            <Typography variant="h6" gutterBottom>
              概要
            </Typography>
            <Typography variant="body1" color="text.secondary">
              QTI Mock は QTI 3.0 (Question and Test Interoperability) アセスメントプラットフォームのデモ実装です。
              Next.js アプリケーションに QTI Player を iframe で埋め込み、
              QTI 準拠のアセスメントアイテムを表示・採点します。
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ my: 2 }}>
            <Typography variant="h6" gutterBottom>
              機能
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <PlayArrow color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="基本問題"
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
                  <AutoAwesome color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="AI選択問題"
                  secondary="生成AIが学習指導要領とその解説を元に作成した4択問題集。教科・学年・分野別に問題を選択して学習可能"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AutoAwesome color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="AI記述問題"
                  secondary="生成AIが作成した記述式問題をAIが採点。採点基準に基づいた詳細なフィードバックを提供"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Edit color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Playground"
                  secondary="QTI XML を直接入力またはドラッグ＆ドロップで実行。URLパラメータ（?set=items-h&startswith=1）で基本問題のサンプルを直接ロード可能"
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
                  primary="フォント・文字サイズ選択"
                  secondary="複数の日本語フォントと文字サイズから選択可能"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AutoAwesome color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="音声入力"
                  secondary="Web Speech API を使用した音声入力機能（Chrome / Edge / Safari）"
                />
              </ListItem>
            </List>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ my: 2 }}>
            <Typography variant="h6" gutterBottom>
              QTI 3.0 と QTI Player
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              QTI (Question and Test Interoperability) は、1EdTech (旧 IMS Global Learning Consortium) が策定した
              アセスメントコンテンツの相互運用性を実現するための国際標準規格です。
              詳細は{' '}
              <Link
                href="https://www.imsglobal.org/question/index.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                1EdTech - QTI Specification
              </Link>
              {' '}を参照してください。
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

          <Divider sx={{ my: 2 }} />

          <Box sx={{ my: 2 }}>
            <Typography variant="h6" gutterBottom>
              学習指導要領LOD
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              AI作成問題では、
              <Link
                href="https://jp-cos.github.io/"
                target="_blank"
                rel="noopener noreferrer"
              >
                学習指導要領LOD
              </Link>
              {' '}を情報源として活用して自動的に問題集の作成を行いました。
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              学習指導要領LODは、文部科学省が公開している学習指導要領と教育要領の内容・コードおよび関連する情報をLinked Open Data (LOD) として公開しています。
              本アプリでは、Linked Open Data (LOD)で整理された学習指導要領と解説の情報を効果的に活用して、生成AIを使って効率良く品質の高い問題集をプログラムを実行して作成します。
            </Typography>
            <Typography variant="body1" color="text.secondary">
              2025-09-27版の学習指導要領LODのデータセットでは、小学校理科と社会科5・6年生分の学習指導要領解説の内容がLOD化されており、本アプリでは小学校6年生の理科と社会の学習指導要領解説を効率良く活用することができました。
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ my: 2 }}>
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
              <Chip label="Tailwind CSS 4" color="primary" />
              <Chip label="Turborepo" color="primary" />
            </Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
              QTI Player
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip label="Vue 3" color="secondary" />
              <Chip label="Vite 7" color="secondary" />
              <Chip
                label="qti3-item-player-vue3"
                color="secondary"
                component="a"
                href="https://github.com/amp-up-io/qti3-item-player-vue3"
                target="_blank"
                clickable
              />
            </Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
              生成AIでの問題作成
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip label="Python" color="success" />
              <Chip label="Claude API" color="success" />
              <Chip label="rdflib" color="success" />
              <Chip label="BeautifulSoup" color="success" />
              <Chip label="lxml" color="success" />
            </Box>
          </Box>

          <AppFooter />
        </CardContent>
      </Card>
  );
}
