'use client';

import { Box, Typography, Card, CardContent } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

export default function PrivatePage() {
  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Private
      </Typography>

      <Card sx={{ mt: 3 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <LockIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            プライベートエリア
          </Typography>
          <Typography variant="body2" color="text.secondary">
            このページは認証されたユーザーのみがアクセスできます。
            現在は開発中のため、プレースホルダーとして表示しています。
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
