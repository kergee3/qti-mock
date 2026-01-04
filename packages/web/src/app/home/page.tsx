'use client';

import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';

export default function HomePage() {
  const router = useRouter();

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        QTI Demo
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        QTI 3.0 (Question and Test Interoperability) アセスメントプラットフォームのデモ実装です。
      </Typography>

      {/* Basic Run */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Basic Run
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            あらかじめ用意された基本的な一連のテストを体験できます。
            選択問題、並べ替え問題、テキスト入力問題などが含まれています。
          </Typography>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={() => router.push('/basic')}
          >
            Basic Run を開始
          </Button>
        </CardContent>
      </Card>

      {/* Flex Play */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Flex Play
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            アイテムを選んで、1問ずつ自由にテストを実行できます。
            問題の編集やカスタマイズも可能です。
          </Typography>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => router.push('/flex')}
          >
            Flex Play を開始
          </Button>
        </CardContent>
      </Card>

      {/* サポートするインタラクション */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            サポートするインタラクション
          </Typography>
          <Typography variant="body2" color="text.secondary" component="ul" sx={{ pl: 2 }}>
            <li>choiceInteraction (単一/複数選択)</li>
            <li>inlineChoiceInteraction (インライン選択)</li>
            <li>matchInteraction (マッチング)</li>
            <li>orderInteraction (並べ替え)</li>
            <li>textEntryInteraction (テキスト入力)</li>
            <li>extendedTextInteraction (長文入力)</li>
            <li>graphicChoiceInteraction (画像選択)</li>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
