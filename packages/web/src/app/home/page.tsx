'use client';

import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

export default function HomePage() {
  const router = useRouter();

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        QTI Demo
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        QTI 3.0 (Question and Test Interoperability) アセスメントプラットフォームのデモ実装です。
      </Typography>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            テストを開始する
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            QTI 3.0 準拠のアセスメントアイテムを体験できます。
            選択問題、並べ替え問題、テキスト入力問題などが含まれています。
          </Typography>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={() => router.push('/test')}
          >
            テストを開始
          </Button>
        </CardContent>
      </Card>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            サポートするインタラクション
          </Typography>
          <Typography variant="body2" color="text.secondary" component="ul" sx={{ pl: 2 }}>
            <li>qti-choice-interaction (単一/複数選択)</li>
            <li>qti-order-interaction (並べ替え)</li>
            <li>qti-text-entry-interaction (テキスト入力)</li>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
