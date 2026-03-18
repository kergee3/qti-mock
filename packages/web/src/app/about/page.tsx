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
  IntegrationInstructions,
  TextRotateVertical,
  Translate,
  FontDownload,
  Mic,
  ListOutlined,
  EditNoteOutlined,
  ConstructionOutlined,
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
              本アプリは QTI 3.0 (Question and Test Interoperability) の技術基盤上に実装された試行的なWebアプリとサービスです。
              <br />
              2026年1月の時点で最新のWeb技術と生成AIを活用し、QTI 準拠のアセスメントアイテムを表示・採点します。
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
                      事前定義された横書き用と縦書き用のテストセットを選択して実行し、結果をサマリー表示。一部のサンプルは{' '}
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
                  <ListOutlined color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="AI選択式"
                  secondary="生成AIが学習指導要領とその解説を元に作成した4択問題集。教科・学年・分野別に問題を選択して学習可能"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <EditNoteOutlined color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="AI記述式"
                  secondary="生成AIが作成した記述式問題をAIが採点。採点基準に基づいた詳細なフィードバックを提供"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <ConstructionOutlined color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Playground"
                  secondary="QTI XML の直接入力、ファイルをドラッグ&ドロップ、または、URLパラメータ指定で、基本問題、AI選択問題、AI記述問題の QTI XML の閲覧と編集が可能"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <TextRotateVertical color="primary" />
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
                  secondary="問題文の表示に、おもな日本語Webフォントを選択可能。Windowsでは「UD デジタル 教科書体」も選択可能。文字サイズも選択可能"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Mic color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="音声入力"
                  secondary="Web Speech API を使用した音声入力が可能（Chrome / Edge / Safari）。設定ページで有効化可能"
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
              QTI 3.0 は2022年にリリースされた最新バージョンで、以下の特徴があります：
            </Typography>
            <List dense sx={{ mb: 2, pl: 2 }}>
              <ListItem sx={{ py: 0 }}>
                <ListItemText
                  primary="• HTML5ベースのコンテンツモデル - 従来のXHTML形式からHTML5へ移行し、リッチなマルチメディアコンテンツに対応"
                  slotProps={{ primary: { variant: 'body2', color: 'text.secondary' } }}
                />
              </ListItem>
              <ListItem sx={{ py: 0 }}>
                <ListItemText
                  primary="• アクセシビリティの強化 - WCAG 2.1準拠、スクリーンリーダー対応、PNP（Personal Needs and Preferences）のサポート"
                  slotProps={{ primary: { variant: 'body2', color: 'text.secondary' } }}
                />
              </ListItem>
              <ListItem sx={{ py: 0 }}>
                <ListItemText
                  primary="• ポータブルカスタムインタラクション（PCI）- カスタムインタラクションタイプの標準化された拡張機構"
                  slotProps={{ primary: { variant: 'body2', color: 'text.secondary' } }}
                />
              </ListItem>
              <ListItem sx={{ py: 0 }}>
                <ListItemText
                  primary="• 多様な問題形式 - 選択式、記述式、マッチング、並べ替え、図形選択など20種類以上のインタラクションタイプ"
                  slotProps={{ primary: { variant: 'body2', color: 'text.secondary' } }}
                />
              </ListItem>
            </List>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              本アプリの QTI Player は、<Link href="https://www.amp-up.io/" target="_blank" rel="noopener noreferrer">Amp-up.io社</Link> で開発され 1EdTech によって認定された Vue 3 ベースの QTI 3.0 レンダリングライブラリ{' '}
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
              AI選択式とAI記述式で使用する問題は、
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
              <Link
                href="https://ja.wikipedia.org/wiki/Linked_Open_Data"
                target="_blank"
                rel="noopener noreferrer"
              >
                Wikipedia
              </Link>
              {' '}などによると、Linked Open Data (LOD)は、Web上で公開される構造化されたオープンデータをコンピュータが処理しやすい形式で相互にリンクさせたデータ空間やその公開手法の総称です。
              LODは、RDF（Resource Description Framework）という標準的なデータモデルを使用してデータを表現し、URI（Uniform Resource Identifier）を用いてデータ間の関係性を示します。
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              学習指導要領LODは、文部科学省が公開している学習指導要領と教育要領の内容・コードおよび関連する情報を LOD として公開しています。
              本アプリでは、LOD として整理された学習指導要領と解説の情報を効果的に活用して、生成AIを使って効率良く品質の高い問題集を自動的に作成します。
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
              <Chip label="Next.js 16.1" color="primary" />
              <Chip label="React 19.2" color="primary" />
              <Chip label="TypeScript 5" color="primary" />
              <Chip label="Material-UI v7.3" color="primary" />
              <Chip label="Tailwind CSS 4" color="primary" />
              <Chip label="Turborepo 2" color="primary" />
            </Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
              QTI Player
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip label="Vue 3.5" color="secondary" />
              <Chip label="Vite 7.2" color="secondary" />
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
              問題作成・採点（生成AI）
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip label="Claude API" color="success" />
              <Chip label="Python" color="success" />
              <Chip label="rdflib" color="success" />
              <Chip label="BeautifulSoup" color="success" />
              <Chip label="lxml" color="success" />
            </Box>
          </Box>

          <Box sx={{ my: 2 }}>
            <Typography variant="body1" color="text.secondary">
              本アプリのソースコードは以下で公開されています。
            </Typography>
            <Typography variant="body1">
              <Link
                href="https://github.com/kergee3/qti-mock"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://github.com/kergee3/qti-mock
              </Link>
            </Typography>
          </Box>

          <AppFooter />
        </CardContent>
      </Card>
  );
}
